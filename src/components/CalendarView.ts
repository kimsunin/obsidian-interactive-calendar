import { App, setIcon, moment } from "obsidian";
import { CalendarViewProps, Task, RootTask  } from "src/types"
import { TaskCreateModal } from "src/components/TaskCreateModal";

// 캘린더 ui, 일정 생성/변경 이벤트 처리
export class CalendarView {
    private headerEl!: HTMLElement;
    private gridEl!: HTMLElement;

    // 일정 변경 이벤트를 위한 변수
    private isDragging = false;
    private dragMode: "resize" | "create" | null = null;
    private dragEdge: "start" | "end" | null = null;
    private dragStart: moment.Moment | null = null;
    private dragEnd: moment.Moment | null = null;
    private activeTask: RootTask | null = null;
    private currentProps: CalendarViewProps | null = null;

    
    constructor(private containerEl: HTMLElement, private app: App){
        this.initLayout();
        this.initEvent();
    }

    // 캘린더 초기화
    private initLayout() {
        this.containerEl.empty();

        // 캘린더 헤더
        this.headerEl = this.containerEl.createDiv({ cls: "calendar-view-header"});
        // 요일 행
        const weekdayEl = this.containerEl.createDiv({ cls: "calendar-view-weekdays" });
        const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

        weekdays.forEach(day => {
            weekdayEl.createDiv({ cls: "calendar-view-weekday", text: day});
        });

        // 날짜 그리드
        this.gridEl = this.containerEl.createDiv({ cls: "calendar-view-grid"});
    }

    private initEvent(){
        // 마우스 떼는 순간 일정 기간 변경 이벤트
        window.addEventListener("mouseup", () => {
            if (!this.isDragging || !this.dragMode) return;

            const mode = this.dragMode;
            const resizedTask = this.activeTask;
            const newStart = this.dragStart;
            const newEnd = this.dragEnd;

            this.isDragging = false;
            this.dragMode = null;
            this.dragStart = null;
            this.dragEnd = null;
            this.activeTask = null;
            this.dragEdge = null;

            if(mode === "resize" && resizedTask && this.currentProps){
                if(newStart && newEnd && (!newStart.isSame(resizedTask.startDate, "day") || !newEnd.isSame(resizedTask.endDate, "day"))){
                    if(this.currentProps.onPeriodResize){
                        void this.currentProps.onPeriodResize(resizedTask, newStart, newEnd);
                    }
                } 
            } else if(mode === "create" && newStart && newEnd && this.currentProps){
                // 새로운 일정 생성 모달 호출
                const s = newStart.isBefore(newEnd, "day") ? newStart.clone() : newEnd.clone();
                const e = newStart.isBefore(newEnd, "day") ? newEnd.clone() : newStart.clone();

                const tempTask: RootTask = {
                    id: `temp-${s.format("YYYY-MM-DD")}-${Math.random().toString(36).substring(2, 9)}`,
                    text: "",
                    date: s.clone(),
                    completed: false,
                    level: 0,
                    startDate: s,
                    endDate: e,
                    children: [],
                    filePath: "",
                    lineNumber: 0,
                    tag: ""
                }

                if (this.currentProps.onCreateTask) {
                    new TaskCreateModal(this.app, tempTask, (newTask) => {
                        this.clearHighlight("period-highlighted-clicked")

                        if (this.currentProps?.onCreateTask) {
                            void this.currentProps.onCreateTask(newTask);
                        } 
                    }).open();
                }
            }
        });
    }

    public render(props: CalendarViewProps){
        this.currentProps = props;
        this.renderHeader(props);
        this.renderGrid(props);
    }

    private renderHeader(props: CalendarViewProps){
        this.headerEl.empty();

        // 연도-월 컨테이너
        this.headerEl.createSpan({
            cls: "calendar-header-title",
            text: props.currentMonth.format("YYYY-MM")
        });

        // < today > 버튼 컨테이너
        const controlsContainer = this.headerEl.createDiv({cls: "calendar-header-controls"});

        // < 버튼
        const prevBtn = controlsContainer.createSpan({
            cls: "calendar-header-controls-prev"
        });
        setIcon(prevBtn, "chevron-left");
        prevBtn.addEventListener("click", () => {
            const prevMonth = props.currentMonth.clone().subtract(1, "month");
            props.onMonthChange(prevMonth);
        });

        // today 버튼
        const todayBtn = controlsContainer.createSpan({
            cls: "calendar-header-controls-today",
            text: "TODAY"
        });
        todayBtn.addEventListener("click", () => {
            props.onDateSelect(moment() as moment.Moment, false);
            props.onMonthChange(moment() as moment.Moment);
        });

        // > 버튼
        const nextBtn = controlsContainer.createSpan({
            cls: "calendar-header-controls-next"
        });
        setIcon(nextBtn, "chevron-right");
        nextBtn.addEventListener("click", () => {
            const nextMonth = props.currentMonth.clone().add(1, "month");
            props.onMonthChange(nextMonth);
        });

        // 새로고침 버튼
        const refreshBtn = controlsContainer.createSpan({
            cls: "calendar-header-controls-refresh"
        });
        setIcon(refreshBtn, "refresh-cw");
        refreshBtn.addEventListener("click", () => {
            if (props.onRefresh) {
                void props.onRefresh();
            }
        });
    }

    private renderGrid(props: CalendarViewProps){
        this.gridEl.empty();

        const startOfMonth = props.currentMonth.clone().startOf("month");
        const startDayOfWeek = startOfMonth.day();

        // 달력 시작 날짜
        const startDate = startOfMonth.clone().subtract(startDayOfWeek, "days");

        // 달력 표시 일수
        const totalDays = 42;
        const currentDate = startDate.clone();

        // 상위 일정 기간 변경 이벤트
        if(props.selectedTag){
            for (const tasks of props.tasksMap.values()){
                this.activeTask = tasks.find(t => t.level === 0 && t.tag === props.selectedTag) || null;
                if(this.activeTask) break;
            }
        }
        for (let i = 0; i < totalDays; i ++){
            const dayDate = currentDate.clone();
            const isCurrentMonth = dayDate.month() === props.currentMonth.month();

            const isToday = dayDate.isSame(moment() as moment.Moment, "day");

            const cellClass = ["calendar-day-cell"];
            if(!isCurrentMonth) cellClass.push("other-month");
            if(isToday) cellClass.push("is-today");

            const dayCell = this.gridEl.createDiv({
                cls: cellClass.join(" ")
            });
            dayCell.dataset.date = dayDate.format("YYYY-MM-DD");

            const dayNumberEl = dayCell.createDiv({
                cls: "day-number",
                text: dayDate.date().toString()
            });
            // 날짜 클릭 이벤트
            dayNumberEl.addEventListener("click", (e) => {
                e.stopPropagation();
                void props.onDateSelect(dayDate, true);
                if (dayDate.month() !== props.currentMonth.month()) {
                    props.onMonthChange(dayDate.clone());
                }
            });

            // 현재 날짜가 속한 최상위 task들 가져오기
            const monthKey = dayDate.format("YYYY-MM");
            const monthTasks = props.tasksMap.get(monthKey) || []
            const rootDayTasks = monthTasks.filter(task => 
                task.level === 0 && dayDate.isBetween(task.startDate, task.endDate, "day", "[]")
            );

            if(rootDayTasks.length > 0){
                // 7개만 렌더링하고 나머지는 +숫자로 렌더링
                const dotsContainer = dayCell.createDiv({cls: "task-dots-container"});

                const hasMore = rootDayTasks.length > 7;
                const renderCount = hasMore ? 7 : rootDayTasks.length;

                for (let idx = 0; idx < renderCount; idx ++){
                    const task = rootDayTasks[idx];
                    const dotClass = ["task-dot"];
                    if (task.completed) {
                        dotClass.push("is-completed");
                    } else {
                        dotClass.push("is-incomplete");
                    }

                    const dotEl = dotsContainer.createDiv({ cls: dotClass.join(" ") });
                    if (task.tag) {
                        dotEl.dataset.tag = task.tag;
                    }

                    // 마우스 호버시 해당 기간이 활성화되는 이벤트
                    dotEl.addEventListener("mouseenter", (e) => {
                        e.stopPropagation();
                        this.highlightPeriod(task.startDate!, task.endDate!, "period-highlighted");
                    });
                    // 마우스 호버 해제시 기간 비활성화
                    dotEl.addEventListener("mouseleave", () => {
                        this.clearHighlight("period-highlighted");
                    })

                    // 태그 클릭시, 기간 활성화 유지 이벤트
                    dotEl.addEventListener("click", (e) => {
                        e.stopPropagation();

                        // 날짜도 변경
                        if (props.onDateSelect) {
                            props.onDateSelect(dayDate, false);
                        }

                        if(task.tag && props.onTagSelect){
                            props.onTagSelect(task.tag);
                        }
                    })
                }
                // 초과 태그만큼 +숫자로 렌더링
                if(hasMore){
                    dotsContainer.createDiv({
                        cls: "task-dot-more",
                        text: "··"
                    });
                }
            }

            // 클릭 이벤트
            dayCell.addEventListener("click", () => {
                if (props.selectedTag && props.onTagSelect){
                    props.onTagSelect(null);
                }
            });

            dayCell.addEventListener("mousedown", (e) => {
                 // 숫자 클릭인지 검사
                if((e.target as HTMLElement).closest(".task-dot") || (e.target as HTMLElement).closest(".day-number")) return;

                // 기존 일정 기간 변경
                if(this.activeTask && (dayDate.isSame(this.activeTask.startDate, "day") || dayDate.isSame(this.activeTask.endDate, "day"))){
                    e.stopPropagation();
                    this.isDragging = true;
                    this.dragMode = "resize";
                    this.dragEdge = dayDate.isSame(this.activeTask.startDate, "day") ? "start" : "end";
                    this.dragStart = this.activeTask.startDate.clone();
                    this.dragEnd = this.activeTask.endDate.clone();
                    return;
                }
                // 새로운 일정 기간 생성
                if(!props.selectedTag){
                    e.stopPropagation();
                    this.isDragging = true;
                    this.dragMode = "create";
                    this.dragStart = dayDate.clone();
                    this.dragEnd = dayDate.clone();
                    this.clearHighlight("period-highlighted-clicked");
                    this.highlightPeriod(this.dragStart, this.dragEnd, "period-highlighted-clicked");
                }

            })
            dayCell.addEventListener("mouseenter", () => {
                if(!this.isDragging || !this.dragMode) return;

                if(this.dragMode === "resize" && this.activeTask && this.dragEdge){
                    // 기존 일정 기간 변경
                    let validDate = dayDate.clone();
                    if(this.dragEdge === "start"){
                        if(validDate.isAfter(this.activeTask.endDate, "day")){
                            // 종료일보다 뒤로이동, 종료일 <-> 시작일 스왑
                            this.dragStart = this.activeTask.endDate.clone();
                            this.dragEnd = validDate;
                        } else {
                            this.dragStart = validDate;
                            this.dragEnd = this.activeTask.endDate.clone();
                        }
                    } else if(this.dragEdge === "end" && this.dragStart){
                        if(validDate.isBefore(this.activeTask.startDate, "day")){
                            // 시작일보다 앞으로 이동, 시작일 <-> 종료일 스왑
                            this.dragEnd = this.activeTask.startDate.clone();
                            this.dragStart = validDate;
                        } else {
                            this.dragEnd = validDate;
                            this.dragStart = this.activeTask.startDate.clone();
                        }
                    }
                    this.clearHighlight("period-highlighted-clicked")
                    if(this.dragStart && this.dragEnd){
                        this.highlightPeriod(this.dragStart, this.dragEnd, "period-highlighted-clicked")
                    }
                } else if (this.dragMode === "create" && this.dragStart) {
                    // 새로운 일정 기간 조절
                    this.dragEnd = dayDate.clone();
                    const s = this.dragStart.isBefore(this.dragEnd, "day") ? this.dragStart : this.dragEnd;
                    const e = this.dragStart.isBefore(this.dragEnd, "day") ? this.dragEnd : this.dragStart;
                    this.clearHighlight("period-highlighted-clicked");
                    this.highlightPeriod(s, e, "period-highlighted-clicked");
                }
            })

            currentDate.add(1, "day");
        }

        // 선택된 일정 기간 활성화
        if (props.selectedTag){
            let selectedTask: RootTask | undefined;
            for (const tasks of props.tasksMap.values()){
                selectedTask = tasks.find(tasks => tasks.level === 0 && tasks.tag === props.selectedTag);
                if(selectedTask) break;
            }
            if(selectedTask){
                this.highlightPeriod(selectedTask.startDate, selectedTask.endDate, "period-highlighted-clicked")
                
            }
        }
    }
        

    

    // 기간 활성화 함수
    public highlightPeriod(startDate: moment.Moment, endDate: moment.Moment, className:string) {
        const cells = this.gridEl.querySelectorAll<HTMLElement>(".calendar-day-cell");

        cells.forEach(cell => {
            const dateStr = cell.dataset.date;
            if (!dateStr) return;

            const cellDate = moment(dateStr) as moment.Moment;
            if (cellDate.isBetween(startDate, endDate, "day", "[]")) {
                cell.classList.add(className);
            }
        });
    }

    // 기간 비활성화 함수 
    public clearHighlight(className: string){
        const cells = this.gridEl.querySelectorAll<HTMLElement>(".calendar-day-cell");
        cells.forEach(cell => {
            cell.classList.remove(className);
        });
    }
}