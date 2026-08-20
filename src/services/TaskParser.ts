import { moment } from "obsidian";
import { Task, RootTask } from "../types";

// task 문자열 <-> task 객체 변환 서비스
export class TaskParser {
    // task 문자열 -> task 객체
    public parse(markdown: string, filePath: string, currentDate: moment.Moment, targetHeader?: string): RootTask[] {
        const lines = markdown.split("\n");
        const rootTasks: RootTask[] = []; // 최상위 task
        const stack: Task[] = []; // 서브 task
        let activeRootTask: RootTask | null = null;

        // - [ ] 또는 - [x]
        const taskRegex = /^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/;
        const headingRegex = /^(#+)\s+(.*)$/;

        let isTargetSection = !targetHeader || targetHeader === "none";
        let targetHeaderLevel = 0;

        if (targetHeader && targetHeader !== "none") {
            const match = targetHeader.match(/^(#+)/);
            if (match) {
                targetHeaderLevel = match[1].length;
            }
        }

        let isSkipMode = false;
        for (let i = 0; i < lines.length; i ++){
            const line = lines[i];
            // 헤더 검사
            const headingMatch = line.match(headingRegex);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const title = headingMatch[2].trim();
                const fullHeader = `${headingMatch[1]} ${title}`;

                if (targetHeader && targetHeader !== "none") {
                    if (fullHeader.toLowerCase() === targetHeader.toLowerCase() || title.toLowerCase() === targetHeader.replace(/^#+\s*/, "").toLowerCase()) {
                        isTargetSection = true;
                    } else if (isTargetSection && level <= targetHeaderLevel) {
                        isTargetSection = false;
                    }
                }
                continue;
            }

            if (!isTargetSection) continue;

            const match = line.match(taskRegex);

            if(!match) continue;

            const indentStr = match[1];
            
            const isCompleted = match[2].toLowerCase() === "x";
            const fullText = match[3].trim();

            const { text, tag } = this.extractTagId(fullText);
            
            const level = this.calculateIndentLevel(indentStr);

            // 태그가 없는 상위 일정이 나온 경우 다음 태그 있는 상위 일정이 나올때까지 스킵
            if(level === 0){
                if(!tag){
                    isSkipMode = true;
                    stack.length = 0;
                    continue;
                } else {
                    isSkipMode = false;
                }
            }
            if(isSkipMode) continue;

            if(level === 0 && tag){
                const rootTask: RootTask = {
                    id: `${filePath}:${i}`,
                    text: text,
                    date: currentDate.clone(),
                    completed: isCompleted,
                    level: level,
                    children: [],
                    filePath: filePath,
                    lineNumber: i + 1,
                    startDate: currentDate.clone(),
                    endDate: currentDate.clone(),
                    tag: tag
                }
                rootTasks.push(rootTask);
                activeRootTask = rootTask;
                stack.length = 0;
            } else {
                const subTask: Task = {
                    id: `${filePath}:${i}`,
                    text: text,
                    date: currentDate.clone(),
                    completed: isCompleted,
                    level: level,
                    children: [],
                    filePath: filePath,
                    lineNumber: i + 1
                }
                while (stack.length > 0 && stack[stack.length - 1].level >= level){
                    stack.pop();
                }
                if(stack.length === 0){
                    if(activeRootTask){
                        activeRootTask.children.push(subTask);
                    }
                } else {
                    const parent = stack[stack.length - 1];
                    parent.children.push(subTask);
                }
                stack.push(subTask);
            }
        }
        return rootTasks;
    }

    // task 객체 -> task 문자열
    public stringify(task: Task | RootTask, targetDate?: moment.Moment): string {
        const indent = "\t".repeat(task.level);
        const checkbox = task.completed ? "[x]" : "[ ]";

        let textWithTag = task.text;
        if(task.level === 0 && "tag" in task){
            textWithTag = `${task.text} #${task.tag}`
        }

        const currentLine = `${indent}- ${checkbox} ${textWithTag}`;
        if(task.children && task.children.length > 0){
            const matchingChildren = targetDate ? task.children.filter(child => child.date && child.date.isSame(targetDate, "day")) : task.children;

            if(matchingChildren.length > 0){
                const childLines = matchingChildren.map(child => {return this.stringify(child)});
                return [currentLine, ...childLines].join("\n");
            }
        }
        return currentLine;
    }

    // task tag 추출
    private extractTagId(fullText: string): { text: string; tag?: string }{
        const tagRegex = /#task\/([^\s]+)/;
        const match = fullText.match(tagRegex);

        if(match){
            const tag = `task/${match[1]}`; 
            const text = fullText.replace(match[0], "").trim(); // 태그가 제거된 문자열
            return { text, tag }
        };

        return { text: fullText };
    }

    // 들여쓰기 레벨 계산
    private calculateIndentLevel(indentStr: string): number {
        let spaces = 0;
        for(const char of indentStr){
            if(char === "\t"){
                spaces += 2;
            } else if (char === " "){
                spaces += 1;
            }
        }
        return Math.floor(spaces / 2); // 공백 2칸 = 들여쓰기 1개
    }
}
