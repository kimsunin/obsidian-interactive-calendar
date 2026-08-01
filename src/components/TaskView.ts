import { App, setIcon, displayTooltip, moment } from "obsidian";
import { Task, TaskViewProps } from "src/types";
import { TaskCreateModal } from "./TaskCreateModal";


export class TaskView {
    private headerEl!: HTMLElement;
    private listContainerEl!: HTMLElement;

    constructor(private containerEl: HTMLElement, private app: App){
        this.initLayout();
    }

    private initLayout(){
        this.containerEl.empty();
        this.headerEl = this.containerEl.createDiv({ cls: "task-view-header" });
        this.listContainerEl = this.containerEl.createDiv({ cls: "task-view-list" });

    }

    public render(props: TaskViewProps){
        this.renderHeader(props);
        this.renderList(props);
    }

    // task 헤더
    private renderHeader(props: TaskViewProps){
        this.headerEl.empty();

        if(props.selectedTag){
            // 태그 선택
            this.headerEl.createEl("h4", {
                cls: "task-view-title focused",
                text: `#${props.selectedTag}`
            });
        } else {
            // 날짜 선택
            this.headerEl.createEl("h4", {
                cls: "task-view-title",
                text: `${props.selectedDate.format("YYYY-MM-DD")}`
            });
        } 
    }

    // task 리스트
    private renderList(props: TaskViewProps){
        this.listContainerEl.empty();

        let displayTasks: Task[] = [];

        if (props.selectedTag) {
            // 태그선택
            const monthKey = props.selectedDate.format("YYYY-MM");
            const monthTasks = props.tasksMap.get(monthKey) || [];
            displayTasks = monthTasks.filter(task => task.level === 0 && task.tag === props.selectedTag);
        } else {
            // 날짜 선택
            const monthKey = props.selectedDate.format("YYYY-MM");
            const monthTasks = props.tasksMap.get(monthKey) || [];
            displayTasks = monthTasks.filter(task => {
                if (task.level !== 0) return false;
                if (task.tag) {
                    return task.startDate && task.endDate && props.selectedDate.isBetween(task.startDate, task.endDate, "day", "[]");
                } else {
                    return task.date && task.date.isSame(props.selectedDate, "day");
                }
            });
        }

        if(displayTasks.length === 0){
            this.listContainerEl.createDiv({
                cls: "task-view-empty",
                text: "등록된 일정이 없습니다."
            });
            return;
        } 

        const ulEl = this.listContainerEl.createEl("ul", { cls: "task-view-list"});

        displayTasks.forEach((task, index) => {
            this.renderTaskNode(ulEl, task, props);
        })
    }

    // 재귀적으로 일정 리스트 생성
    private renderTaskNode(parentEl: HTMLElement, task: Task, props: TaskViewProps){
        if (task.level > 0) {
            if (!task.date || !props.selectedDate.isSame(task.date, "day")) {
                return;
            }
        }

        const liEl = parentEl.createEl("li", { cls: `task-view-list-item level-${task.level}`});
        const itemContentEl = liEl.createDiv({ cls: "task-view-list-item-content"});

        // 체크박스 
        const checkboxEl = itemContentEl.createEl("input", {
            type: "checkbox",
            cls: "task-checkbox"
        });
        checkboxEl.checked = task.completed;
        
        checkboxEl.addEventListener("click", () => {
            task.completed = checkboxEl.checked;
            if(props.ontaskToggle){
                props.ontaskToggle(task);
            }
        });

        itemContentEl.createEl("span", {
            cls: `task-text ${task.completed ? "is-completed" : ""}`,
            text: task.text
        });

        const addBtn = itemContentEl.createEl("span", {
            cls: "task-add-btn child-add-btn"
        });
        setIcon(addBtn, "plus");

        addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            
            const targetDate = task.date || props.selectedDate;
            const childTempTask: Task = {
                id: `temp-child-${Date.now()}`,
                text: "",
                date: targetDate.clone(),
                completed: false,
                level: task.level + 1,
                children: [],
                filePath: task.filePath,
                lineNumber: 0,
                rawText: ""
            };

            new TaskCreateModal(this.app, childTempTask, (newChildTask) => {
                if(newChildTask && props.onTaskUpdate){
                    task.children.push(newChildTask);
                    const rootTask = this.findRootTask(task, props);
                    if(rootTask){
                        props.onTaskUpdate(rootTask, targetDate);
                    }
                }
            }).open();
        })

        if(task.children && task.children.length > 0){
            const childUl = liEl.createEl("ul", { 
                cls: "task-children"
            });
            task.children.forEach(childTask => {
                this.renderTaskNode(childUl, childTask, props);
            });
        }
    }

    // 부모 찾기 헬퍼 함수
    private findRootTask(target: Task, props: TaskViewProps) : Task | undefined {
        if(target.level === 0) return target;

        const monthKey = (target.date || props.selectedDate).format("YYYY-MM");
        const monthTasks = props.tasksMap.get(monthKey) || [];

        for (const root of monthTasks){
            if(root.level ===0 && this.isChildOf(root, target)){
                return root;
            }
        }
        return undefined;
    }

    // 자식 포함 여부 헬퍼 함수
    private isChildOf(parent: Task, target: Task) : boolean {
        if(!parent.children || parent.children.length === 0) return false;

        for (const child of parent.children){
            if(child === target || child.id === target.id || this.isChildOf(child, target)){
                return true;
            }
        }
        return false;
    }
}