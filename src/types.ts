import { moment } from "obsidian"

// CalednarView props 데이터
export interface CalendarViewProps {
    selectedDate: moment.Moment;
    currentMonth: moment.Moment;
    tasksMap: Map<string, RootTask[]>;
    selectedTag: string| null;
    onDateSelect: (date: moment.Moment, openNote: boolean) => Promise<void> | void;
    onMonthChange: (date: moment.Moment) => void;
    onTagSelect: (tag: string | null) => void;
    onPeriodResize: (
        task: RootTask,
        oldStart: moment.Moment,
        oldEnd: moment.Moment,
        newStart: moment.Moment,
        newEnd: moment.Moment
    ) => Promise<void> | void;
    onCreateTask: (task: RootTask | null) => Promise<void> | void;
    onRefresh: () => Promise<void> | void;
}

// TaskView props 데이터
export interface TaskViewProps {
    selectedDate: moment.Moment;
    selectedTag: string | null;
    tasksMap: Map<string, RootTask[]>;
    onTaskToggle: (task: Task) => Promise<void> | void; // 체크박스 토글 콜백
    onTagSelect: (tag: string | null) => void;
    onTaskHover: (task: RootTask, isEnter: boolean) => void;
}

// task 데이터
export interface Task {
    id: string;
    text: string;
    date: moment.Moment;
    completed: boolean;
    level: number;
    children: Task[];
    filePath: string;
    lineNumber: number;
}
export interface RootTask extends Task {
    startDate: moment.Moment;
    endDate: moment.Moment;
    tag: string;
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