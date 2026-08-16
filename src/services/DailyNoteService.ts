import { App, TFile, moment } from "obsidian";
import {
    getAllDailyNotes,
    getDateFromFile,
    getDailyNote,
    createDailyNote
} from "obsidian-daily-notes-interface";
import { TaskParser } from "./TaskParser";
import { Task, CalendarSettings } from "src/types";

export class DailyNoteService {
    private app: App;
    private taskParser: TaskParser;
    private settings: CalendarSettings;

    constructor(app: App, settings: CalendarSettings){
        this.app = app;
        this.taskParser = new TaskParser();
        this.settings = settings;
    }

    // 모든 데일리 노트를 읽고 파싱한 후, 월별로 그룹화하여 일정 반환(병렬처리)
    public async getAllTasks(): Promise<Map<string, Task[]>> {
        const dailyNotes: Record<string, TFile> = getAllDailyNotes();
        const tagMap = new Map<string, Task>();
        const header = this.settings.useSectionHeader ? this.settings.todoSectionHeader : undefined;

        // 병렬처리로 노트를 읽어서 파싱
        const readPromises = Object.values(dailyNotes).map(async (file) => {
            const noteDate = getDateFromFile(file, "day");
            if(!noteDate) return null;

            const content = await this.app.vault.read(file);
            const tasks = this.taskParser.parse(content, file.path, header);
            return { noteDate, tasks };
        });

        const results = await Promise.all(readPromises);

        // 파싱된 일정을 Map으로 변환 및 minDate, maxDate 갱신
        for (const res of results){
            if(!res) continue;
            const { noteDate, tasks } = res;
            for (const task of tasks){
                task.date = noteDate.clone();
                if (task.level === 0 && task.tag) {
                    if (!tagMap.has(task.tag)) {
                        task.startDate = noteDate.clone();
                        task.endDate = noteDate.clone();
                        for(const child of task.children){
                            child.date = noteDate.clone();
                        }
                        tagMap.set(task.tag, task);
                    } else {
                        const bounds = tagMap.get(task.tag)!;
                        if (noteDate.isBefore(bounds.startDate)) bounds.startDate = noteDate.clone();
                        if (noteDate.isAfter(bounds.endDate)) bounds.endDate = noteDate.clone();

                        for(const child of task.children){
                            child.date = noteDate.clone();
                            bounds.children.push(child);
                        }
                    }
                } 
            }
        }

        // 원별 그룹화
        const monthMap = new Map<string, Task[]>();
        for(const task of tagMap.values()){
            if(!task.startDate || !task.endDate) continue;

            const curr = task.startDate.clone().startOf("month");
            const endMonth = task.endDate.clone().startOf("month");

            while(curr.isSameOrBefore(endMonth, "month")){
                const key = curr.format("YYYY-MM");
                const list = monthMap.get(key) || []
                list.push(task);
                monthMap.set(key, list);
                curr.add(1, "month");
            }
        }

        return monthMap
    }

    // 특정 날짜의 데일리 노트를 읽어오기, 없으면 생성
    public async getOrCreateDailyNote(date: moment.Moment): Promise<TFile>{
        const dailyNotes = getAllDailyNotes();
        let file = getDailyNote(date, dailyNotes);
        if(!file){
            file = await createDailyNote(date);
        }
        return file;
    }
        

    // 날짜 클릭시 해당 날짜의 데일리 노트를 오픈, 없는 경우 생성
    public async openOrCreateDailyNote(date: moment.Moment): Promise<void> {
        const file = await this.getOrCreateDailyNote(date);
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, {active: true});
    }

    // 일정 상태변경, 상위 일정인 경우 모든 기간 변경, 하위 일정인 경우 해당 날짜만 변경(병렬처리)
    public async toggleTaskState(task: Task): Promise<void> {
        // 상위 일정 -> 기간 내에 속한 모든 데일리 노트에 반영
        if(task.level ===0 && task.tag && task.startDate && task.endDate){
            const dailyNotes = getAllDailyNotes();
            const tagKeyword = `#${task.tag}`;

            // 일정 기간에 포함된 모든 데일리 노트에 병렬로 반영
            const modifyPromises = Object.values(dailyNotes).map(async (file) => {
                const noteDate = getDateFromFile(file, "day");
                if(!noteDate || !noteDate.isBetween(task.startDate, task.endDate, "day", "[]")) return;

                const content = await this.app.vault.read(file);
                const lines = content.split("\n");
                let hasChanged = false;

                for (let i = 0; i < lines.length; i ++){
                    const line = lines[i];
                    if(line.includes(tagKeyword)){
                        const updatedLine = task.completed ? 
                            lines[i] = line.replace(/^(\s*[-*+]\s+\[)[ ](\])/, "$1x$2") : 
                            lines[i] = line.replace(/^(\s*[-*+]\s+\[)[xX](\])/, "$1 $2");

                        if(lines[i] !== updatedLine){
                            lines[i] = updatedLine;
                            hasChanged = true;
                        }
                        break;
                    }
                }
                if(hasChanged){
                    await this.app.vault.modify(file, lines.join("\n"));
                }
            });

            await Promise.all(modifyPromises);
        }
        // 하위 일정 -> 해당 날짜의 데일리 노트에만 반영
        else {
            const file = this.app.vault.getAbstractFileByPath(task.filePath);
            if(!(file instanceof TFile)) return;

            const content = await this.app.vault.read(file);
            const lines = content.split("\n");

            const lineIndex = task.lineNumber - 1;
            if(lineIndex < 0 || lineIndex >= lines.length) return;

            const targetLine = lines[lineIndex];

            let updatedLine = targetLine;
            if(task.completed){
                updatedLine = targetLine.replace(/^(\s*[-*+]\s+\[)[ ](\])/, "$1x$2");
            } else {
                updatedLine = targetLine.replace(/^(\s*[-*+]\s+\[)[xX](\])/, "$1 $2");
            }

            lines[lineIndex] = updatedLine;
            await this.app.vault.modify(file, lines.join("\n"));
        }
    }

    // 일정 업데이트(하위 일정 추가, 제거)
    // public async updateTask(rootTask: Task, targetDate?: moment.Moment): Promise<void> {
    //     const fileDate = targetDate || rootTask.date || moment();
    //     const file = await this.getOrCreateDailyNote(fileDate);

    //     const content = await this.app.vault.read(file);
    //     const lines = content.split("\n");

    //     const startLineIndex = rootTask.lineNumber - 1;
    //     if(startLineIndex < 0 || startLineIndex >= lines.length) return;

    //     const endLineIndex = this.getMaxChildLine(rootTask, fileDate) - 1;

    //     const newBlockContent = this.taskParser.stringify(rootTask, fileDate);
    //     const newBlockLines = newBlockContent.split("\n");

    //     const deleteCount = endLineIndex - startLineIndex + 1;
    //     lines.splice(startLineIndex, deleteCount, ...newBlockLines);

    //     await this.app.vault.modify(file, lines.join("\n"));
    // }

    // 일정 추가(상위 일정 추가)
    public async addTask(task: Task): Promise<void> {
        const targetDate = task.date || moment();
        
        const file = await this.getOrCreateDailyNote(targetDate);

        const content = await this.app.vault.read(file);
        const lines = content.split("\n");

        const newTaskContent = this.taskParser.stringify(task, targetDate);

        const useHeader = this.settings.useSectionHeader && this.settings.todoSectionHeader && this.settings.todoSectionHeader !== "none";
        const headerTitle = useHeader ? this.settings.todoSectionHeader : null;

        if(headerTitle){
            let headerIndex = -1;
            const cleanTitle = headerTitle.replace(/^#+\s*/, "").toLowerCase();

            // 헤더 위치 찾기
            for (let i = 0; i < lines.length; i ++){
                const line = lines[i];
                if(line.match(/^#+\s+/) && line.toLowerCase().includes(cleanTitle)){
                    headerIndex = i;
                    break;
                }
            }

            if(headerIndex !== -1){
                // 헤더가 있는 경우
                let insertIndex = headerIndex + 1;
                for (let i = headerIndex + 1; i < lines.length; i ++){
                    const line = lines[i].trim();
                    // 다음 헤더 또는 구분선이 나오기 전까지 사이에 삽입
                    if(line.match(/^#+\s+/) || line.match(/^---+\s*$/)){
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
        await this.app.vault.modify(file, lines.join("\n"));
    }

    // 일정 삭제(상위 일정 제거)
    public async removeTask(task: Task, targetDate?: moment.Moment): Promise<void> {
        const fileDate = targetDate || task.date || moment();
        const dailyNotes = getAllDailyNotes();
        const file = getDailyNote(fileDate, dailyNotes);
        if (!file) return;

        const content = await this.app.vault.read(file);
        const tagKeyword = task.tag ? `#${task.tag}` : null;

        if (tagKeyword && !content.includes(tagKeyword)) return;

        const lines = content.split("\n");
        const parsedTasks = this.taskParser.parse(content, file.path);

        const targetRootTask = tagKeyword ? parsedTasks.find(t => t.level === 0 && t.tag === task.tag)
                : parsedTasks.find(t => t.lineNumber === task.lineNumber);

        if(targetRootTask){
            const startLineIndex = targetRootTask.lineNumber - 1;
            const endLineIndex = this.getMaxChildLine(targetRootTask, fileDate) - 1;

            const deleteCount = endLineIndex - startLineIndex + 1;
            lines.splice(startLineIndex, deleteCount);

            await this.app.vault.modify(file, lines.join("\n"));
        }
    }

    // 기간 일정 수정, 일정이 줄어든 경우 삭제, 일정이 길어진 경우 추가(병렬처리)
    public async updateTaskPeriod(
        task: Task,
        oldStart: moment.Moment,
        oldEnd: moment.Moment,
        newStart: moment.Moment,
        newEnd: moment.Moment
    ): Promise<void>{
        if(!task.tag) return;

        if(oldStart.isSame(newStart, "day") && oldEnd.isSame(newEnd, "day")) return;

        const oldDates = new Set<string>();
        const currOld = oldStart.clone();
        while(currOld.isSameOrBefore(oldEnd, "day")){
            oldDates.add(currOld.format("YYYY-MM-DD"));
            currOld.add(1, "day");
        }

        const newDates = new Set<string>();
        const currNew = newStart.clone();
        while(currNew.isSameOrBefore(newEnd, "day")){
            newDates.add(currNew.format("YYYY-MM-DD"));
            currNew.add(1, "day");
        }

        const taskPromises: Promise<void>[] = [];

        // 삭제
        for (const dateStr of oldDates){
            if(!newDates.has(dateStr)){
                const removedDate = moment(dateStr, "YYYY-MM-DD") as moment.Moment;
                taskPromises.push(this.removeTask(task, removedDate));
            }
        }
        
        // 추가
        for (const dateStr of newDates){
            if(!oldDates.has(dateStr)){
                const addedDate = moment(dateStr, "YYYY-MM-DD") as moment.Moment;
                const tempTask: Task = {
                    ...task,
                    date: addedDate.clone(),
                    level: 0
                }
                taskPromises.push(this.addTask(tempTask));
            }
        }

        await Promise.all(taskPromises);
    }

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
