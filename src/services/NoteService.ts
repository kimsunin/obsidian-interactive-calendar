import { App, TFile, moment } from "obsidian";
import { getAllDailyNotes, getDailyNote, createDailyNote } from "obsidian-daily-notes-interface";

// 노트파일에 직접 접근하는 로직
export class NoteService {
    private app: App;

    constructor(app: App){
        this.app = app;
    }

    public getAllNoteFiles(): Record<string, TFile> {
        return getAllDailyNotes();
    }

    public getNoteFile(date: moment.Moment): TFile | null {
        const dailyNotes = this.getAllNoteFiles();
        return getDailyNote(date, dailyNotes) || null;
    }

    public getFileByPath(path: string): TFile | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        if(file instanceof TFile){
            return file;
        }
        return null;
    }

    public async getOrCreateNoteFile(date: moment.Moment): Promise<TFile> {
        const file = this.getNoteFile(date);
        if(file){
            return file;
        } 
        return await createDailyNote(date);
    }

    public async readNote(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }

    public async writeNote(file: TFile, content: string): Promise<void> {
        await this.app.vault.modify(file, content);
    }

    public async openNote(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file, { active : true });
    }
}