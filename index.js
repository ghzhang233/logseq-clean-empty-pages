import "@logseq/libs";

const excludedPages = new Set([
    "done", "canceled", "favorites", "a", "todo",
    "wait", "card", "b", "in-progress", "c",
    "now", "waiting", "later", "cancelled"
]);

const deleteEmptyPages = async () => {
    const pages = await logseq.DB.datascriptQuery(`
    [:find (pull ?p [:block/name]) 
     :where [?p :block/name] 
            (not [?p :block/journal? true])]
  `);

    if (pages) {
        for (const [page] of pages) {
            if (page && page["name"] && !excludedPages.has(page["name"])) {
                // Check if page has any blocks
                const pageBlocks = await logseq.DB.datascriptQuery(`
          [:find (pull ?b [*]) 
           :where [?b :block/page ?p] 
                  [?p :block/name "${page["name"]}"]]
        `);

                if (!pageBlocks || pageBlocks.length === 0) {
                    console.log(`Deleting page: ${page["name"]}`);
                    await logseq.Editor.deletePage(page["name"]);
                }
            }
        }
    }
};

const deleteEmptyJournals = async () => {
    const journals = await logseq.DB.datascriptQuery(`
    [:find (pull ?p [:block/name :block/journal? :block/date]) 
     :where [?p :block/journal? true]]
  `);

    if (journals) {
        for (const [journal] of journals) {
            if (journal && journal["name"] && journal["journal?"]) {
                // Check if journal has any blocks
                const journalBlocks = await logseq.DB.datascriptQuery(`
          [:find (pull ?b [*]) 
           :where [?b :block/page ?p] 
                  [?p :block/name "${journal["name"]}"]]
        `);

                if (!journalBlocks || journalBlocks.length === 0) {
                    console.log(`Deleting journal: ${journal["name"]}`);
                    await logseq.Editor.deletePage(journal["name"]);
                }
            }
        }
    }
};

const clearEmptyPagesAndJournals = async () => {
    await deleteEmptyPages();
    await deleteEmptyJournals();
    logseq.UI.showMsg("Empty pages and journals cleared!", "success");
};

const main = () => {
    logseq.useSettingsSchema([
        {
            key: "autoCleanOnStartup",
            type: "boolean",
            title: "Auto Clean on Startup",
            description: "Automatically remove empty pages and journals when Logseq starts.",
            default: false,
        }
    ]);

    logseq.provideModel({
        clearPages: clearEmptyPagesAndJournals
    });

    logseq.App.registerUIItem("toolbar", {
        key: "clear-empty-pages",
        template: `
        <a class="button" data-on-click="clearPages" title="Clean Empty Pages">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6L18 20H6L5 6"></path>
          <path d="M10 11V17"></path>
          <path d="M14 11V17"></path>
          <path d="M9 6V3H15V6"></path>
        </svg>
        </a>
    `
    });

    // Run auto-clean if enabled in settings
    if (logseq.settings?.autoCleanOnStartup) {
        console.log("Running automatic empty page cleanup...");
        clearEmptyPagesAndJournals();
    }
};

logseq.ready(main).catch(console.error);
