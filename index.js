document.addEventListener("DOMContentLoaded", () => {
    const DEFAULT_STYLE = 'simple';
    let CURRENT_STYLE = DEFAULT_STYLE;

    function createKeyValueSpan(key, value) {
        let sp = document.createElement("span");
        sp.innerHTML = `<strong>${key}:</strong> ${value}`;
        return sp;
    }

    function noKeyOnlyValue(key, value) {
        let sp = document.createElement("span");
        sp.textContent = value;
        return sp;
    }

    const styles = {
        'simple' : { 
            "row_container" : {
                "element" : "div",
                "classes" : ["row"]
            },
            "field_container" : {
                "element" : "div",
                "classes" : ["col", "display-6"]
            },
            "field_handlers" : {
                "color" : (i, color) => noKeyOnlyValue("", color),
                "value" : (i, value) => noKeyOnlyValue("", value),
            },
            "item_handler" : (row_element, result) => {
                row_element.style.background = result.value;
                row_element.lastChild.remove();
                row_element.querySelector("div:first-child").style.color = "rgba(0,0,0,0)";
                return row_element;
            }
        },

        'cards' : {
            'row_container' : {
                "element" : "div",
                'classes' : ['card', 'col', 'my-2']
            },
            'field_container' : {'element' : '', 'classes' : []},
            "item_handler" : (row_element, result) => row_element,
            "field_handlers" : {
                "color" : (i, color) => {
                    let tmp_el = document.createElement("div");
                    tmp_el.classList.add("card-header");
                    tmp_el.classList.add("fs-5");
                    tmp_el.textContent = color;
                    return tmp_el;
                },
                "value" : (i, value) => {
                    let tmp_el = document.createElement("div");
                    tmp_el.classList.add("card-body");

                    let tmp_txt = document.createElement("div");
                    tmp_txt.classList.add('card-text');
                    let tmp_span = createKeyValueSpan("Hexadecimal", value)
                    tmp_txt.appendChild(tmp_span);
                    tmp_el.appendChild(tmp_txt);
                    return tmp_el;
                }
            }
        },

        "table" : {
            "row_container" : {"element" : "tr", 'classes' : []},
            "field_container" : {"element" : "td", 'classes' : []},
            "field_handlers" : {
                'color' : (i, color) => noKeyOnlyValue("", color),
                'value' : (i, value) => noKeyOnlyValue("", value),
            },
            "item_handler" : (row_element, result) => row_element
        },
        "autosuggest" : {
            "row_container" : {
                "element" : "div",
                "classes" : ["row"]
            },
            "field_container" : {
                "element" : "div",
                "classes" : ["col"]
            },
            "field_handlers" : {
                "color" : (i, color) => noKeyOnlyValue("", color),
                "value" : (i, value) => noKeyOnlyValue("", value),
            },
            "item_handler" : (row_element, result) => {
                row_element.style.background = result.value;
                let in_field = document.querySelector("input[name='color']");
                row_element.firstChild.remove();
                row_element.addEventListener('click', () => {
                    in_field.value = result['color'];
                    refreshResult();
                });
                row_element.setAttribute("search-value", result['color']);
                row_element.addEventListener('mouseover', () =>  row_element.id = "color-selected");
                row_element.addEventListener('mouseout', () => row_element.id="");
                row_element.querySelector("div:last-child").style.color = "rgba(0,0,0,0)";
                return row_element;
            }
        }
    }

    let search = new DynamicSearch({
        search_URL : 'datasets/xkcd.json',
        query_input_elements_map : {'color' : document.querySelector("input[name='color']")},
        'result_container' : document.querySelector("#search_results"),
        "row_container" : styles[DEFAULT_STYLE]['row_container'],
        "field_container" : styles[DEFAULT_STYLE]['field_container']
    });



    search.maxItems = 10;

    search.itemHandler = styles[DEFAULT_STYLE]['item_handler'];

    // Fetch once only
    search.resultCache = search.fetchResult().then( (result) => {
        search.renderSearchResults(result);
        search.autoFetch = false;
        document.querySelector("#col_num").textContent = `${result.length} colors`;
        return result;
    });

    function switchStyle(new_style) {
        if(new_style == CURRENT_STYLE) return;
        search.row_container = styles[new_style]['row_container'];
        search.field_container = styles[new_style]['field_container'];
        search.itemHandler = styles[new_style]['item_handler'];
        if('field_handlers' in styles[new_style]) {
            Object.entries(styles[new_style]['field_handlers']).forEach( ([field, handler]) => search.setDisplayFieldHandler(field, handler));
        }
        if(new_style === 'table') {
            let table = document.createElement("table");
            table.classList.add('table');
            table.classList.add('table-striped');
            table.classList.add('text-center');
            table.id = "table_search_results";

            let table_head = document.createElement("thead");
            let thead_row = document.createElement("tr");
            const headers = ['Color', 'Value'];
            headers.forEach((header) => {
                let tmp_th = document.createElement('th');
                tmp_th.textContent = header;
                thead_row.appendChild(tmp_th);
            })
            table_head.appendChild(thead_row);
            table.appendChild(table_head);

            let table_body = document.createElement("tbody");
            table_body.id = "search_results";

            table.appendChild(table_body);

            let original_search = document.querySelector("#search_results");
            original_search.replaceWith(table);
            search.resultContainer = table_body;
        }
        else {
            let tbl = document.querySelector("table#table_search_results");
            if(tbl) {
                let new_search_container = document.createElement("div");
                new_search_container.id = "search_results";
                new_search_container.classList.add(...['container', 'p-5']);
                tbl.replaceWith(new_search_container);
                search.resultContainer = new_search_container;
            }

            let search_res_box = document.querySelector("#search_results");
            if(new_style === "autosuggest") {
                search_res_box.classList.remove("p-5");
                search_res_box.classList.add("autosuggest_box");
                search_res_box.style.display = 'none';
            }
            else {
                search_res_box.classList.remove("autosuggest_box");
                search_res_box.classList.add("p-5");
                search_res_box.style.display = 'block';
            }
        }
        CURRENT_STYLE = new_style;
        refreshResult();
    }

    document.querySelectorAll(".switch_style").forEach( (el) => {
        el.addEventListener('click', () => switchStyle(el.getAttribute("target_style")));
    });

    document.querySelector("input[name='color']").addEventListener("focusin", () => {
        if(CURRENT_STYLE === "autosuggest") document.querySelector(".autosuggest_box").style.display = 'block';
    });
    document.querySelector("input[name='color']").addEventListener("focusout", () => {
        if(CURRENT_STYLE === "autosuggest") setTimeout( () => document.querySelector(".autosuggest_box").style.display = 'none', 1);
    });

    function refreshResult() {
        search.renderSearchResults(search.filterExistingResult(search.resultCache));
    }

    function SelectSearchRow(row_element) { 
        let curr_selection = document.querySelector("#color-selected");
        if(curr_selection) curr_selection.id = "";
        row_element.id = "color-selected";
        let in_field = document.querySelector("input[name='color']");
        in_field.value = "";
        in_field.value = row_element.getAttribute("search-value");
        in_field.focus();
    }

    document.addEventListener("keydown", (e) => {
        let search_results = document.querySelector("#search_results");
        if(CURRENT_STYLE !== "autosuggest") return;
        if(!search_results.checkVisibility()) return;
        if(e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
        let curr_selected = document.querySelector("#color-selected");

        // Nothing is selected
        if(!curr_selected) {
            if(e.key === "ArrowDown") SelectSearchRow(search_results.firstChild);
            else if(e.key === "ArrowUp") SelectSearchRow(search_results.lastChild);
        }

        // Something is selected
        else {
            let current_selection = document.querySelector("#color-selected");
            let final_selection = null;
            // Edge cases: arrow up on first element & arrow down on last element

            if(e.key === "ArrowUp") {
                let prev_sibling = current_selection.previousSibling;
                if(!prev_sibling) final_selection = search_results.lastChild;
                else final_selection = prev_sibling;
            }

            else if(e.key === "ArrowDown") {
                let next_sibling = current_selection.nextSibling;
                if(!next_sibling) final_selection = search_results.firstChild;
                else final_selection = next_sibling;
            }

            if(final_selection) SelectSearchRow(final_selection);

            if(e.key === "Enter") {
                if(current_selection) {
                    current_selection.click();
                    document.querySelector("input[name='color']").blur();
                }
            }
        }
        e.preventDefault();
    });
});