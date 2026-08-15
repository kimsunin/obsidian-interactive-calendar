import { moment } from "obsidian"

// CalednarView props 데이터
export interface CalendarViewProps {
    selectedDate: moment.Moment;
    currentMonth: moment.Moment;
    tasksMap: Map<string, Task[]>;
    selectedTag: string| null;
    onDateSelect: (date: moment.Moment) => void;
    onMonthChange: (date: moment.Moment) => void;
    onTagSelect: (tag: string | null) => void;
    onDayNumberClick: (date: moment.Moment) => Promise<void> | void;
    onPeriodResize: (
        task: Task,
        oldStart: moment.Moment,
        oldEnd: moment.Moment,
        newStart: moment.Moment,
        newEnd: moment.Moment
    ) => Promise<void> | void;
    onCreateTask: (task: Task | null) => Promise<void> | void;
    onRefresh: () => Promise<void> | void;
}

// TaskView props 데이터
export interface TaskViewProps {
    selectedDate: moment.Moment;
    selectedTag: string | null;
    tasksMap: Map<string, Task[]>;
    onTaskToggle: (task: Task) => Promise<void> | void; // 체크박스 토글 콜백
    onTagSelect: (tag: string | null) => void;
    onTaskHover: (task: Task, isEnter: boolean) => void;
}

// task 데이터
export interface Task {
    id: string;
    text: string;
    date: moment.Moment;

    completed: boolean;
    level: number;

    // 최상위 task를 위한 기간 정보
    startDate?: moment.Moment;
    endDate?: moment.Moment;
    tag?: string;

    // 하위 task
    children: Task[];

    // 파일 정보
    filePath: string;
    lineNumber: number;
    rawText: string;
}

export const VIEW_TYPE_INTERACTIVE_CALENDAR = "interactive-calendar-view";

// 플러그인 설정 데이터
export interface CalendarSettings{
    useSectionHeader: boolean;
    todoSectionHeader: string;
}

// 플러그인 기본 설정값 정의
export const DEFAULT_SETTINGS: CalendarSettings = {
    useSectionHeader: true,
    todoSectionHeader: "none"
}