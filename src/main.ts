import { Plugin, WorkspaceLeaf } from 'obsidian';
import {InteractiveCalendarView, VIEW_TYPE_INTERACTIVE_CALENDAR} from "./components/InteractiveCalendarView";

export default class InteractiveCalendarPlugin extends Plugin {
	async onload() {
		console.log('Loading Interactive Calendar plugin');

		// 최상이 컨테이너 등록
		this.registerView(
			VIEW_TYPE_INTERACTIVE_CALENDAR,
			(leaf: WorkspaceLeaf) => new InteractiveCalendarView(leaf)
		);

		// 왼족 메뉴에 아이콘 추가
		this.addRibbonIcon("calendar", "Open Interactive Calendar", () => {
			this.activateView();
		});

		// 명령어로 실행
		this.addCommand({
			id: "open-interactive-calendar",
			name: "Open Interactive Calendar",
			callback : () => {
				this.activateView();
			}
		})
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
			this.app.workspace.revealLeaf(leaf);
		}
	}

	onunload() {
		console.log('Unloading Interactive Calendar plugin');
	}
}
