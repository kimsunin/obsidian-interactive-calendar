import { moment } from "obsidian"

// CalednarView props 데이터
export interface CalendarViewProps {
    selectedDate: moment.Moment;
    currentMonth: moment.Moment;
    tasksMap: Map<string, Task[]>;
    selectedTag: string| null;
    onDateSelect: (date: moment.Moment) => void;
    onMonthChange: (date: moment.Moment) => void;
    onTagSelect: (tag: string) => void;
    onDayNumberClick: (date: moment.Moment) => void;
    onPeriodResize: (
        task: Task,
        oldStart: moment.Moment,
        oldEnd: moment.Moment,
        newStart: moment.Moment,
        newEnd: moment.Moment
    ) => void;
    onCreateTask: (task: Task | null) => void;
    onRefresh: () => void;
}

// TaskView props 데이터
export interface TaskViewProps {
    selectedDate: moment.Moment;
    selectedTag: string | null;
    tasksMap: Map<string, Task[]>;
    onTaskToggle: (task: Task) => void; // 체크박스 토글 콜백
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

// 플러그인 설정 데이터
export interface CaledarSettings{
    todoSectionHeader: string; // 파싱용 task 섹션 헤더
}

// 플러그인 기본 설정값 정의
export const DEFAULT_SETTINGS: CaledarSettings = {
    todoSectionHeader: "TODO",
}