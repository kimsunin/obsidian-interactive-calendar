import { App, Modal, Setting, moment } from "obsidian";
import { Task } from "src/types";

export class TaskCreateModal extends Modal {
    private isSubmitted: boolean = false;

    constructor(app: App, private task: Task, private onSubmit: (task: Task | null) => void){
        super(app);
    }

    onOpen(){
        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl("h3", { text: "Add New Task" });

        const s = this.task.startDate || this.task.date;
        const e = this.task.endDate || this.task.date;
        const periodText = s.isSame(e, "day") ? s.format("YYYY-MM-DD") : `${s.format("YYYY-MM-DD")} ~ ${e.format("YYYY-MM-DD")}`;

        new Setting(contentEl).setName("period").setDesc(periodText);

        new Setting(contentEl).setName("title").addText((text) => {
            text.setPlaceholder("enter task title");
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
        if(this.task.level === 0){
            this.task.tag = `task/${this.task.text.trim().replace(/\s+/g, "_")}`
        } else {
            this.task.tag = undefined;
        }
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