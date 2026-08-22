import { App, Modal, Setting } from "obsidian";
import { Task, RootTask } from "src/types";

// task 생성 후 task 객체 반환
export class TaskCreateModal extends Modal {
    private isSubmitted: boolean = false;

    constructor(app: App, private task: RootTask, private onSubmit: (task: RootTask | null) => void){
        super(app);
    }

    onOpen(){
        this.modalEl.addClass("task-create-modal");
        const { contentEl } = this;
        contentEl.empty();

        
        contentEl.createEl("h4", { text: "Add New Task" });

        const s = this.task.startDate || this.task.date;
        const e = this.task.endDate || this.task.date;
        const periodText = s.isSame(e, "day") ? s.format("YYYY-MM-DD") : `${s.format("YYYY-MM-DD")} ~ ${e.format("YYYY-MM-DD")}`;

        new Setting(contentEl).setDesc(periodText);

        new Setting(contentEl).addText((text) => {
            text.setPlaceholder("enter task");
            text.onChange((value) =>{
                this.task.text = value;
            });
            text.inputEl.addEventListener("keydown", (evt) => {
                if(evt.key === "Enter" && this.task.text.trim()){
                    this.submitTask();
                }
            })
        });

        new Setting(contentEl).addButton((btn) => {
            btn.setButtonText("cancel").onClick(() => {this.close();});
        }).addButton((btn)=>{
            btn.setButtonText("create").setCta().onClick(() => { if(this.task.text.trim()){ this.submitTask(); }})
        });
    }

    private submitTask() {
        this.isSubmitted = true;
        const targetDate = this.task.startDate || this.task.date;
        const dateSuffix = targetDate.format("YYYYMMDD");

        const clenarText = this.task.text.trim().replace(/\s+/g, "_");
        this.task.tag = `task/${clenarText}_${dateSuffix}`;
        this.close();
        this.onSubmit(this.task);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if(!this.isSubmitted) {
            this.onSubmit(null);
        }
    }
}