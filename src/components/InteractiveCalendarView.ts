import {ItemView, WorkspaceLeaf, moment } from "obsidian";
import { CalendarView } from "./CalendarView";
import { CalendarSettings, Task, RootTask } from "src/types";
import { DailyNoteService } from "src/services/DailyNoteService";
import { TaskView } from "./TaskView";
import { VIEW_TYPE_INTERACTIVE_CALENDAR } from "src/types";

export class InteractiveCalendarView extends ItemView {
    private calendarView: CalendarView | null = null;
    private taskView: TaskView | null = null;
    private topSection: HTMLDivElement | null = null;
    private bottomSection: HTMLDivElement | null = null;

    private dailyNoteService: DailyNoteService

    // 날짜 상태 관리
    private selectedDate: moment.Moment = moment() as moment.Moment;
    private currentMonth: moment.Moment = (moment() as moment.Moment).startOf("month");
    private selectedTag: string | null = null;

    // 월별 task 캐시
    private monthTaskCache = new Map<string, RootTask[] >();

    constructor(leaf: WorkspaceLeaf, settings: CalendarSettings){
        super(leaf);
        this.dailyNoteService = new DailyNoteService(this.app, settings);
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
        this.monthTaskCache = await this.dailyNoteService.getAllTasks();
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
                        await this.dailyNoteService.openOrCreateDailyNote(date);
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
                onPeriodResize: async (task, oldStart, oldEnd, newStart, newEnd) => {
                    this.updateView();  
                    await this.dailyNoteService.updateTaskPeriod(task, oldStart, oldEnd, newStart, newEnd);
                },
                onCreateTask: async (task: RootTask | null) =>{
                    if(task){
                        const startMonth = task.startDate!.clone().startOf("month");
                        const endMonth = task.endDate!.clone().startOf("month");
                        const mCurr = startMonth.clone();

                        while(mCurr.isSameOrBefore(endMonth, "month")){
                            const key = mCurr.format("YYYY-MM");
                            const monthTasks = this.monthTaskCache.get(key) || [];
                            if(!monthTasks.some(t => t.tag === task.tag || t.id === task.id)){
                                monthTasks.push(task);
                            }
                            this.monthTaskCache.set(key, monthTasks);
                            mCurr.add(1, "month");
                        }
                        this.selectedTag = task.tag || null;

                        this.updateView();

                        const filePromises: Promise<void>[] = [];
                        const curr = task.startDate!.clone();
                        while(curr.isSameOrBefore(task.endDate, "day")){
                            const dayTask: RootTask = {
                                ...task,
                                date: curr.clone()
                            };
                            filePromises.push(this.dailyNoteService.addTask(dayTask));
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
                    await this.dailyNoteService.toggleTaskState(task);
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
	