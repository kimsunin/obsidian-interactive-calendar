# Obsidian Interactive Calendar

https://github.com/user-attachments/assets/d8829018-4baf-4722-80e9-3ff1e3b98622

> Can we manage multi-day schedules in Obsidian using Daily Notes?

As an Obsidian user who manages schedules through Daily Notes, you might have experienced clear limitations when trying to manage continuous schedules (i.e., events spanning multiple days).
- Having to repeatedly write the same task across multiple Daily Notes, and having to visit and check off each note one by one when the task is complete.
- Writing the period info inside a single note, but feeling frustrated because the duration is not visually represented.

*This project was born out of the desire to have a calendar in Obsidian—similar to conventional calendar apps—that allows you to visually track period schedules and manage them in blocks (fully integrated with Daily Notes).*

## Installation

1. Open Obsidian and go to Settings > Community plugins.
2. Click Browse and search for Interactive Calendar.
3. Click **Install**, then click Enable.

## Usage

1. Open the Interactive Calendar view from the ribbon icon (calendar icon) or using the command palette: Interactive Calendar: Open.
2. Click on a date to open the Daily Note.
3. Drag and drop on the calendar to create a multi-day (period) task.
4. Manage tasks in the bottom pane.

## Calendar

https://github.com/user-attachments/assets/71cb05bc-fb13-42e3-96f3-352528a1fe7d

> Just like other Obsidian calendar plugins, clicking a date opens or automatically creates the corresponding Daily Note.

- Clicking a date on the calendar opens that day's Daily Note in the editor.
- If the Daily Note does not exist, it will be automatically created and opened.

## Task

https://github.com/user-attachments/assets/e1d22b97-4bfa-4a62-ac99-f97470bae93d

> You can view and manage tasks for the selected date through the TaskView at the bottom of the calendar.

- Check or uncheck tasks added to the current Daily Note directly in the task management view.
- Changes to task completion states in the task management view are reflected in the Daily Note in real-time.
- Checking off a multi-day (period) task will apply the changes to all Daily Notes within that period.

*If you modify a task directly in the editor, you can sync the calendar using the refresh button.*

## Period Task

https://github.com/user-attachments/assets/f19b4fbb-4faf-4f67-bb14-2d05911ad338

> The core feature of the plugin: easily add and modify tasks in your Daily Notes by clicking or dragging-and-dropping on the calendar. Adding a period task automatically adds it to all Daily Notes within that timeframe.

- Click to add a task to a specific date.
- Drag-and-drop to add multi-day period tasks.
- Easily adjust the duration of an existing task using drag-and-drop.
- Just like task checking, task creation and modification are reflected in your Daily Notes in real-time.
- Tasks are categorized and styled by tags.

*No more writing the same task in multiple Daily Notes. Simply add a period task with a single drag-and-drop.*

## Setting

https://github.com/user-attachments/assets/d5051537-0035-4230-9e36-31625d2257a1

> Configure the section where tasks will be added.

- Users can set the target section for task insertion to match their own Daily Note template.
- The plugin detects and lists headings starting with `#` in your template for selection.
- If no template is used, tasks are appended to the bottom of the Daily Note. A toggle is provided to include a section header in this case.

---

*Lately, I’ve been thinking a lot about schedule management.
What is the best way to manage schedules for users like me who can't let go of Daily Notes?
Is there a way to sync it with mobile devices (is obsidian sync the only answer...)?
What level of task granularity works best?*

*If you share similar thoughts, I'd love to hear them!
Please feel free to share your thoughts, solutions, or new ideas in the GitHub Discussions section.
Advice on utilizing Obsidian is also highly welcome, as this project is still in its early stages and has room for improvement!*

*For feature requests and bug reports, please open an Issue or a PR on GitHub.*

## License

This project is licensed under the [MIT License](./LICENSE).
