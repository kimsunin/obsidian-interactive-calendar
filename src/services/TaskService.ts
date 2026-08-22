import { App, moment } from "obsidian";
import { Task, RootTask, CalendarSettings } from "src/types";
import { TaskParser } from "./TaskParser";
import { NoteService } from "./NoteService";
import { getDateFromFile } from "obsidian-daily-notes-interface";

// 일정 객체를 노트에 반영하거나 노트에서 일정 객체를 읽어오는 비즈니스 로직
export class TaskService{
    private noteService: NoteService;
    private taskParser: TaskParser;
    private settings: CalendarSettings;

    constructor(noteService: NoteService, settings: CalendarSettings){
        this.noteService = noteService;
        this.taskParser = new TaskParser();
        this.settings = settings;
    }

    // 모든 데일리 노트에 있는 일정을 월별로 파싱하여 리턴
    public async getAllTasks(): Promise<Map<string, RootTask[]>> {
        const dailyNotes = this.noteService.getAllNoteFiles();
        const tagMap = new Map<string, RootTask>();
        const header = this.settings.useSectionHeader ? this.settings.todoSectionHeader : undefined;

        // 병렬처리로 노트를 읽어서 파싱
        const readPromises = Object.values(dailyNotes).map(async (file) => {
            const noteDate = getDateFromFile(file, "day");
            if(!noteDate) return null;

            const content = await this.noteService.readNote(file);
            const tasks = this.taskParser.parse(content, file.path, noteDate, header);

            return { noteDate, tasks };
        });

        const results = await Promise.all(readPromises);

        // 파싱된 일정을 Map으로 변환 및 minDate, maxDate 갱신
        for (const res of results) {
            if(!res) continue;
            const { noteDate, tasks } = res;
            for (const task of tasks) {
                task.date = noteDate.clone();
                if(task.level === 0 && task.tag) {
                    if (!tagMap.has(task.tag)) {
                        task.startDate = noteDate.clone();
                        task.endDate = noteDate.clone();
                        for (const child of task.children) {
                            child.date = noteDate.clone();
                        }
                        tagMap.set(task.tag, task);
                    } else {
                        const bounds = tagMap.get(task.tag)!;
                        if (noteDate.isBefore(bounds.startDate)) bounds.startDate = noteDate.clone();
                        if (noteDate.isAfter(bounds.endDate)) bounds.endDate = noteDate.clone();
                        for (const child of task.children) {
                            child.date = noteDate.clone();
                                bounds.children.push(child);
                            }
                        }
                    }
                }
            }

        // 월별 그룹화
        const monthMap = new Map<string, RootTask[]>();
        for (const task of tagMap.values()) {
            if (!task.startDate || !task.endDate) continue;

            const curr = task.startDate.clone().startOf("month");
            const endMonth = task.endDate.clone().startOf("month");

            while (curr.isSameOrBefore(endMonth, "month")) {
                const key = curr.format("YYYY-MM");
                const list = monthMap.get(key) || [];
                list.push(task);
                monthMap.set(key, list);
                curr.add(1, "month");
            }
        }

        return monthMap;
    }

    // 하위 일정은 해당 일정만 토글, 상위 일정의 경우 해당 기간을 모두 토글
    public async toggleTask(task: Task | RootTask): Promise<void> {
        if (task.level === 0 && "tag" in task) {
            const dailyNotes = this.noteService.getAllNoteFiles();
            const tagKeyword = `#${task.tag}`;

            // 일정 기간에 포함된 모든 데일리 노트에 병렬로 반영
            const modifyPromises = Object.values(dailyNotes).map(async (file) => {
                const noteDate = getDateFromFile(file, "day");
                if (!noteDate || !noteDate.isBetween(task.startDate, task.endDate, "day", "[]")) return;

                const content = await this.noteService.readNote(file);
                const lines = content.split("\n");
                let hasChanged = false;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes(tagKeyword)) {
                        const updatedLine = task.completed
                            ? line.replace(/^(\s*[-*+]\s+\[)[ ](\])/, "$1x$2")
                            : line.replace(/^(\s*[-*+]\s+\[)[xX](\])/, "$1 $2");
                        if (lines[i] !== updatedLine) {
                            lines[i] = updatedLine;
                            hasChanged = true;
                        }
                        break;
                    }
                }
                if (hasChanged) {
                    await this.noteService.writeNote(file, lines.join("\n"));
                }
            });

            await Promise.all(modifyPromises);
        }
        // 하위 일정 -> 해당 날짜의 데일리 노트에만 반영
        else {
            const file = this.noteService.getFileByPath(task.filePath);
            if (!file) return;

            const content = await this.noteService.readNote(file);
            const lines = content.split("\n");

            const lineIndex = task.lineNumber - 1;
            if (lineIndex < 0 || lineIndex >= lines.length) return;

            const targetLine = lines[lineIndex];

            let updatedLine = targetLine;
            if (task.completed) {
                updatedLine = targetLine.replace(/^(\s*[-*+]\s+\[)[ ](\])/, "$1x$2");
            } else {
                updatedLine = targetLine.replace(/^(\s*[-*+]\s+\[)[xX](\])/, "$1 $2");
            }

            if (targetLine !== updatedLine) {
                lines[lineIndex] = updatedLine;
                await this.noteService.writeNote(file, lines.join("\n"));
            }
        }
    }

    // 상위 일정 추가
    public async addTask(task: RootTask): Promise<void> {
        const targetDate = task.date || moment();
        const file = await this.noteService.getOrCreateNoteFile(targetDate);

        const content = await this.noteService.readNote(file);
        const lines = content.split("\n");

        const newTaskContent = this.taskParser.stringify(task, targetDate);

        const useHeader = this.settings.useSectionHeader && this.settings.
            todoSectionHeader && this.settings.todoSectionHeader !== "none";
        const headerTitle = useHeader ? this.settings.todoSectionHeader :
            null;

        if (headerTitle) {
            let headerIndex = -1;
            const cleanTitle = headerTitle.replace(/^#+\s*/, "").toLowerCase();

            // 헤더 위치 찾기
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.match(/^#+\s+/) && line.toLowerCase().includes(cleanTitle)) {
                    headerIndex = i;
                    break;
                }
            }

            if (headerIndex !== -1) {
                // 헤더가 있는 경우
                let insertIndex = headerIndex + 1;
                for (let i = headerIndex + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    // 다음 헤더 또는 구분선이 나오기 전까지 사이에 삽입
                    if (line.match(/^#+\s+/) || line.match(/^---+\s*$/)) {
                        insertIndex = insertIndex - 1;
                        break;
                    }
                    insertIndex = i + 1;
                }
                lines.splice(insertIndex, 0, newTaskContent);
            } else {
                // 헤더가 없는 경우
                const formattedHeader = headerTitle.startsWith("#") ?
                    headerTitle : `## ${headerTitle}`;
                lines.push("", formattedHeader, newTaskContent);
            }
        } else {
            // 헤더를 사용하지 않는 경우
            lines.push(newTaskContent);
        }
        await this.noteService.writeNote(file, lines.join("\n"));
    }

    // 상위 일정 삭제
    public async removeTask(task: RootTask, targetDate?: moment.Moment): Promise<void> {
        const fileDate = targetDate || task.date;
        const file = this.noteService.getNoteFile(fileDate);
        if (!file) return;

        const content = await this.noteService.readNote(file);
        const tagKeyword = `#${task.tag}`;

        if (tagKeyword && !content.includes(tagKeyword)) return;

        const lines = content.split("\n");
        const parsedTasks = this.taskParser.parse(content, file.path, fileDate);

        const targetRootTask = parsedTasks.find(t => t.level === 0 && t.tag === task.tag);

        if (targetRootTask) {
            const startLineIndex = targetRootTask.lineNumber - 1;
            const endLineIndex = this.getMaxChildLine(targetRootTask, fileDate) - 1;

            const deleteCount = endLineIndex - startLineIndex + 1;
            lines.splice(startLineIndex, deleteCount);

            await this.noteService.writeNote(file, lines.join("\n"));
        }
    }

    // 일정 업데이트(하위 일정 추가, 제거)
    // public async updateTask(task: RootTask): Promise<void> {
    //     const fileDate = task.date;
    //     const file = await this.noteService.getOrCreateNoteFile(fileDate);

    //     const content = await this.noteService.readNote(file);
    //     const lines = content.split("\n");

    //     const startLineIndex = task.lineNumber - 1;
    //     if(startLineIndex < 0 || startLineIndex >= lines.length) return;

    //     const endLineIndex = this.getMaxChildLine(task, fileDate) - 1;

    //     const newBlockContent = this.taskParser.stringify(task, fileDate);
    //     const newBlockLines = newBlockContent.split("\n");

    //     const deleteCount = endLineIndex - startLineIndex + 1;
    //     lines.splice(startLineIndex, deleteCount, ...newBlockLines);

    //     await this.noteService.writeNote(file, lines.join("\n"));
    // }


    private getMaxChildLine(task: Task, fileDate: moment.Moment): number {
        let max = task.lineNumber;
        if (task.children && task.children.length > 0) {
            const matchingChildren = task.children.filter(c => c.date && c.date.isSame(fileDate, "day"));
            for (const child of matchingChildren) {
                max = Math.max(max, this.getMaxChildLine(child, fileDate));
            }
        }
        return max;
    }
}
