import { App, TFile, moment } from "obsidian";
import { getAllDailyNotes, getDailyNote, createDailyNote } from "obsidian-daily-notes-interface";

// 노트파일에 직접 접근하는 로직
export class NoteService {
    private app: App;

    constructor(app: App){
        this.app = app;
    }

    // 모든 데일리 노트 파일 반환
    public getAllNoteFiles(): Record<string, TFile> {
        return getAllDailyNotes();
    }

    // 특정 날짜의 데일리 노트 파일 반환
    public getNoteFile(date: moment.Moment): TFile | null {
        const dailyNotes = this.getAllNoteFiles();
        return getDailyNote(date, dailyNotes) || null;
    }

    // 파일 경로를 통한 데일리 노트 파일 반환
    public getFileByPath(path: string): TFile | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        if(file instanceof TFile){
            return file;
        }
        return null;
    }

    // 특정 날짜의 노트 파일을 반환, 없으면 생성
    public async getOrCreateNoteFile(date: moment.Moment): Promise<TFile> {
        const file = this.getNoteFile(date);
        if(file){
            return file;
        } 
        return await createDailyNote(date);
    }

    // 데일리 노트를 문자열로 반환
    public async readNote(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }

    // 데일리 노트에 문자열 작성
    public async writeNote(file: TFile, content: string): Promise<void> {
        await this.app.vault.modify(file, content);
    }

    // obsidian 에디터에서 데일리 노트 열기
    public async openNote(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, { active : true });
    }
}