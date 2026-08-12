import { Plugin, WorkspaceLeaf } from 'obsidian';
import {InteractiveCalendarView} from "./components/InteractiveCalendarView";
import {SettingTab} from "./settings";
import { CalendarSettings, DEFAULT_SETTINGS, VIEW_TYPE_INTERACTIVE_CALENDAR } from "./types";

export default class InteractiveCalendarPlugin extends Plugin {
	settings!: CalendarSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));

		// 최상이 컨테이너 등록
		this.registerView(
			VIEW_TYPE_INTERACTIVE_CALENDAR,
			(leaf: WorkspaceLeaf) => new InteractiveCalendarView(leaf, this.settings)
		);

		// 왼족 메뉴에 아이콘 추가
		this.addRibbonIcon("calendar", "Open Interactive Calendar", () => {
			void this.activateView();
		});

		// 명령어로 실행
		this.addCommand({
			id: "open",
			name: "Open",
			callback : () => {
				void this.activateView();
			}
		})
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<CalendarSettings>;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

	// 사이드바에 뷰 추가
	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_INTERACTIVE_CALENDAR);

		if(leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if(leaf){
				await leaf.setViewState({
					type: VIEW_TYPE_INTERACTIVE_CALENDAR,
					active: true
				});
			}
		}
		if(leaf){
			void this.app.workspace.revealLeaf(leaf);
		}
	}

	onunload() {
	}
}
