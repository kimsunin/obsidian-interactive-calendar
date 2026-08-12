import { PluginSettingTab, App, Setting, TFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import InteractiveCalendarPlugin from "./main";

export class SettingTab extends PluginSettingTab {
    plugin: InteractiveCalendarPlugin;

    constructor(app: App, plugin: InteractiveCalendarPlugin){
        super(app, plugin); 
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Interactive Calendar Settings")
            .setHeading();

        const dailyNoteSettings = getDailyNoteSettings();
        const templatePath = dailyNoteSettings?.template;

        let templateFile: TFile | null = null;
        let templateHeadings: string[] = [];

        if(templatePath){
            const normalizedPath = templatePath.endsWith(".md") ? templatePath : `${templatePath}.md`;
            const abstractFile = this.app.vault.getAbstractFileByPath(normalizedPath);
            if(abstractFile instanceof TFile){
                templateFile = abstractFile;
            }
        }

        const setting = new Setting(containerEl).setName("section header");
        if(templateFile){
            // 템플릿 존재
            const cache = this.app.metadataCache.getFileCache(templateFile);
            if(cache?.headings && cache.headings.length > 0){
                templateHeadings = cache.headings.map(h => `${"#".repeat(h.level)} ${h.heading}`);
            }

            setting.addDropdown(dropdown => {
                dropdown.addOption("none", "none");
                templateHeadings.forEach(h => {
                    dropdown.addOption(h, h);
                });

                dropdown.setValue(this.plugin.settings.todoSectionHeader || "none");

                dropdown.onChange(async (value) => {
                    this.plugin.settings.todoSectionHeader = value;
                    this.plugin.settings.useSectionHeader = value !== "none";
                    await this.plugin.saveSettings();
                });
            });
        } else {
            // 템플릿 없음
            let textInputEl: HTMLInputElement;
            setting.addToggle(toggle => {
                toggle.setValue(this.plugin.settings.useSectionHeader);
                toggle.onChange(async (value) => {
                    this.plugin.settings.useSectionHeader = value;
                    if(textInputEl){
                        textInputEl.disabled = !value;
                    }
                    await this.plugin.saveSettings();
                });
            });

            setting.addText(text => {
                textInputEl = text.inputEl;
                text.setPlaceholder("header title");
                text.setValue(this.plugin.settings.todoSectionHeader);
                text.setDisabled(!this.plugin.settings.useSectionHeader);
                text.onChange(async (value) => {
                    this.plugin.settings.todoSectionHeader = value.trim();
                    await this.plugin.saveSettings();
                });
            });
        }
    }
}