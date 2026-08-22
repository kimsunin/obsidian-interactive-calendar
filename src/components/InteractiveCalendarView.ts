import {ItemView, WorkspaceLeaf, moment, Notice } from "obsidian";
import { CalendarView } from "./CalendarView";
import { CalendarSettings, Task, RootTask } from "src/types";
import { TaskView } from "./TaskView";
import { VIEW_TYPE_INTERACTIVE_CALENDAR } from "src/types";
import { NoteService } from "src/services/NoteService";
import { TaskService } from "src/services/TaskService";

// task 캐시 관리, CalendarView, TaskView 렌더링
export class InteractiveCalendarView extends ItemView {
    private calendarView: CalendarView | null = null;
    private taskView: TaskView | null = null;
    private topSection: HTMLDivElement | null = null;
    private bottomSection: HTMLDivElement | null = null;

    private taskService: TaskService
    private noteService: NoteService

    // 날짜 상태 관리
    private selectedDate: moment.Moment = moment() as moment.Moment;
    private currentMonth: moment.Moment = (moment() as moment.Moment).startOf("month");
    private selectedTag: string | null = null;

    // 월별 task 캐시
    private monthTaskCache = new Map<string, RootTask[] >();

    constructor(leaf: WorkspaceLeaf, settings: CalendarSettings){
        super(leaf);
        this.noteService = new NoteService(this.app);
        this.taskService = new TaskService(this.noteService, settings);
    }

    getViewType(): string {
        return VIEW_TYPE_INTERACTIVE_CALENDAR;
    }

    getDisplayText(): string {
        return "Interactive Calendar";
    }

    getIcon(): string {
        return "calendar"
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();

        const viewContainer = container.createDiv({cls: 'interactive-calendar-view'});

        // 상단 캘린더 영역
        this.topSection = viewContainer.createDiv({cls: 'interactive-calendar-top'});
        this.calendarView = new CalendarView(this.topSection, this.app);
        
        this.bottomSection = viewContainer.createDiv({cls: 'interactive-calendar-bottom'});
        this.taskView = new TaskView(this.bottomSection, this.app);

        // 최초 렌더링
        await this.refreshAllNotes();
    }    

    private async refreshAllNotes(): Promise<void> {
        this.monthTaskCache = await this.taskService.getAllTasks();
        this.selectedDate = moment();
        this.currentMonth = moment().startOf("month");
        this.selectedTag = null;
        this.updateView();
    }

    private updateView() {
        // 캘린더 렌더링 
        if(this.calendarView){
            this.calendarView.render({
                selectedDate: this.selectedDate,
                currentMonth: this.currentMonth,
                tasksMap: this.monthTaskCache,
                selectedTag: this.selectedTag,
                onDateSelect: async (date: moment.Moment, openNote: boolean) => {
                    this.selectedDate = date;
                    this.selectedTag = null;
                    if(openNote){
                        const file = await this.noteService.getOrCreateNoteFile(date);
                        await this.noteService.openNote(file);
                    }
                    this.updateView();
                },
                onMonthChange: (date: moment.Moment) => {
                    this.currentMonth = date;
                    this.updateView();
                },
                onTagSelect: (tag: string | null) => {
                    this.selectedTag = tag;
                    this.updateView();
                },
                onPeriodResize: async (task, newStart, newEnd) => {
                    const oldStart = task.startDate.clone();
                    const oldEnd = task.endDate.clone();

                    const oldStartMonth = oldStart.clone().startOf("month");
                    const oldEndMonth = oldEnd.clone().startOf("month");
                    let curr = oldStartMonth.clone();
                    while(curr.isSameOrBefore(oldEndMonth, "month")){
                        const key = curr.format("YYYY-MM");
                        const monthTasks = this.monthTaskCache.get(key) || [];
                        this.monthTaskCache.set(key, monthTasks.filter(t => t.tag !== task.tag));
                        curr.add(1, "month");
                    }

                    task.startDate = newStart.clone();
                    task.endDate = newEnd.clone();

                    const newStartMonth = newStart.clone().startOf("month");
                    const newEndMonth = newEnd.clone().startOf("month");
                    curr = newStartMonth.clone();

                    while(curr.isSameOrBefore(newEndMonth, "month")){
                        const key = curr.format("YYYY-MM");
                        const monthTasks = this.monthTaskCache.get(key) || [];
                        if(!monthTasks.some(t => t.tag === task.tag)){
                            monthTasks.push(task);
                        }
                        this.monthTaskCache.set(key, monthTasks);
                        curr.add(1, "month");
                    }                    

                    this.updateView();

                    const oldDates = new Set<string>();
                    const currOld = oldStart.clone();
                    while (currOld.isSameOrBefore(oldEnd, "day")) {
                        oldDates.add(currOld.format("YYYY-MM-DD"));
                        currOld.add(1, "day");
                    }

    			    const newDates = new Set<string>();
    			    const currNew = newStart.clone();
    			    while (currNew.isSameOrBefore(newEnd, "day")) {
    			        newDates.add(currNew.format("YYYY-MM-DD"));
                        currNew.add(1, "day");
        		    }

    			    const filePromises: Promise<void>[] = [];

    			    // 삭제
    			    for (const dateStr of oldDates) {
    			        if (!newDates.has(dateStr)) {
                                const removedDate = moment(dateStr, "YYYY-MM-DD") as moment.Moment;
    				        filePromises.push(this.taskService.removeTask(task, removedDate));
                        }
        		    }

    			    // 추가
    			    for (const dateStr of newDates) {
    			        if (!oldDates.has(dateStr)) {
                            const addedDate = moment(dateStr, "YYYY-MM-DD") as moment.Moment;
    				        const tempTask: RootTask = {
    				            ...task,
                                date: addedDate.clone(),
                                level: 0
    				        };
    				        filePromises.push(this.taskService.addTask(tempTask));
                        }
                    }

    			    // 병렬처리
    			    await Promise.all(filePromises);
                },
                onCreateTask: async (task: RootTask | null) =>{
                    if(task){
                        const startMonth = task.startDate!.clone().startOf("month");
                        const endMonth = task.endDate!.clone().startOf("month");
                        const mCurr = startMonth.clone();

                        while(mCurr.isSameOrBefore(endMonth, "month")){
                            const key = mCurr.format("YYYY-MM");
                            const monthTasks = this.monthTaskCache.get(key) || [];
                            if(!monthTasks.some(t => t.tag === task.tag)){
                                monthTasks.push(task);
                            } else {
                                new Notice("task already exist.");
                                return;
                            }
                            this.monthTaskCache.set(key, monthTasks);
                            mCurr.add(1, "month");
                        }
                        this.selectedTag = task.tag || null;
                        this.selectedDate = task.date;

                        this.updateView();

                        const filePromises: Promise<void>[] = [];
                        const curr = task.startDate!.clone();
                        while(curr.isSameOrBefore(task.endDate, "day")){
                            const dayTask: RootTask = {
                                ...task,
                                date: curr.clone()
                            };
                            filePromises.push(this.taskService.addTask(dayTask));
                            curr.add(1, "day");
                        }
                        await Promise.all(filePromises);
                    }
                },
                onRefresh: async () => {
                    await this.refreshAllNotes();
                }
            });
        }

        // 일정 렌더링
        if(this.taskView){
            this.taskView.render({
                selectedDate: this.selectedDate,
                selectedTag: this.selectedTag,
                tasksMap: this.monthTaskCache,   
                onTaskToggle: async (task: Task) => {
                    this.updateView();
                    await this.taskService.toggleTask(task);
                },
                onTagSelect: (tag: string | null) => {
                    this.selectedTag = tag;
                    this.updateView();
                },
                onTaskHover: (task: RootTask, isEnter: boolean) => {
                    if(this.calendarView){
                        if(isEnter){
                            this.calendarView.highlightPeriod(task.startDate, task.endDate, "period-highlighted");
                        } else {
                            this.calendarView.clearHighlight("period-highlighted");
                        }
                    }
                }
            })
        }
    }

    async onClose(): Promise<void> {}
}
	