class DynamicSearch {
    // Note: Some methods have been defined with arrow functions rather than the typical JS style 
    // Here's why: https://stackoverflow.com/questions/36438774/unexpected-value-of-this-in-typescript
    
    // Class attributes
    DEFAULT_FIELD_HANDLER = (field_name, value) => {
        let tmp_el = document.createElement("span");
        tmp_el.innerHTML = `<strong>${field_name}:</strong> ${value}`;
        return tmp_el;
    };

    constructor(config) {
        // These are required for hitting the API
        this.search_URL = config.search_URL;

        // This defines how the search results will be rendered
        // (row|field)_container are objects which specify the type of element and the classes used
        // result_container is the element where these rows will be rendered
        this.row_container = config.row_container;
        this.field_container = config.field_container;
        this.result_container = config.result_container;

        // This defines the arguments to be sent to the API URL, with the input fields for getting those arg values
        this.query_input_elements_map = config.query_input_elements_map;
        // This defines parameters that cannot be changed by the user
        this.request_params = {}
        
        // By default, we auto fetch from the API. 
        // But in some cases, we may want to simply use this to filter
        // Through a large set of data, to pick out the most suitable rows....
        // In that case, we set auto_fetch to false using a setter!
        this.auto_fetch = true;
        
        this.max_items = 10;

        // If search should be case sensitive, set this to true
        this.case_sensitive_filter = false;
        
        // display_field_handler refers to a map between:
        // 1. Fields (passed as Object keys via the API)
        // 2. Functions that take (display_name, field_value) and return an element
        this.display_field_handlers = {};

        // item_handler refers to a function that takes in (row_element, result_object)
        // And processes the item as a whole (perhaps assigning a colour based on values of a sub-field)
        // Returns the  processed row_element
        this.item_handler = null;
        
        // Variables to store the state of the dynamic search
        this.UPDATE_REQUESTED = false;
        this.LAST_UPDATE = {}; // Stores the parameters with which the last query was made
        this.LATEST_SEARCH_RESULT = [];
        Object.entries(this.query_input_elements_map).forEach(([query_param, input_element]) => {
            this.LAST_UPDATE[query_param] = "";
            input_element.addEventListener('input', this.requestUpdate);
        });
    }
    
    set itemHandler(handler) { 
        this.item_handler = handler;
    }
    
    set autoFetch(switch_to) {
        this.auto_fetch = switch_to;
    }

    set resultCache(arr) {
        this.LATEST_SEARCH_RESULT = arr;
    }

    set resultContainer(container) {
        this.result_container = container;
    }

    set maxItems(n) {
        this.max_items = n;
    }

    get resultCache() {
        return this.LATEST_SEARCH_RESULT;
    }

    // Run this after complete configuration has been done
    ready = () => this.updateResults();

    setRequestParams = (params_to_values) => Object.entries(params_to_values).forEach( ([req_arg, value]) => this.request_params[req_arg] = value);
    setDisplayFieldHandler = (field, handler) => this.display_field_handlers[field] = handler;
    getFieldHandler = (field) => (field in this.display_field_handlers) ? this.display_field_handlers[field] : this.DEFAULT_FIELD_HANDLER;
    
    
    createEmptyContainer(type) {
        const container_info = (type ==="row") ? this.row_container : this.field_container;
        if(container_info && container_info['element']) {
            const el = document.createElement(container_info['element']);
            el.classList.add(...container_info['classes']);
            return el;
        }
    }
    createEmptyRow = () => this.createEmptyContainer('row');
    createEmptyField = () => this.createEmptyContainer('field');
    
    
    createRow(row_result) {
        let tmp_row = this.createEmptyRow();
        Object.entries(row_result).forEach( ([field, value]) => {
            let tmp_field = this.createField(field, value);
            if(tmp_field) tmp_row.appendChild(tmp_field);
        });
        if(this.item_handler) tmp_row = this.item_handler(tmp_row, row_result);
        return tmp_row;
    }

    createField(field, value) {
        let field_handler = this.getFieldHandler(field);

        let tmp_field = field_handler(field, value);
        if(!tmp_field) return false;

        let tmp_el = this.createEmptyField();
        if(tmp_el) tmp_el.appendChild(tmp_field);
        else tmp_el = tmp_field;
        return tmp_el;
    }
    
    getQueryValueMap() {
        const tmp_map = {};
        Object.entries(this.query_input_elements_map).forEach(([q_arg, field]) => tmp_map[q_arg] = field.value);
        return tmp_map;
    }

    requestUpdate = () => {
        if(this.UPDATE_REQUESTED) return;
        this.UPDATE_REQUESTED = true;
        setTimeout(this.updateResults, 250);
    }
    
    filterExistingResult = () => {

        const original_result = this.LATEST_SEARCH_RESULT;
        let filtered_result = [];
        
        // Create filters using this.query_input_elements_map (Field_Name : input element)
        // So something of this sort: {0 : 'ok-', 1: 'ollypop'}
        const filter_field_to_value = {};
        let some_filter = false;
        for(const [field_name, input_el] of Object.entries(this.query_input_elements_map)) {
            let tmp_field_value = input_el.value;
            let tmp_field_filter_applied = (tmp_field_value !== "")
            if(tmp_field_filter_applied) {
                if(!this.case_sensitive_filter) tmp_field_value = tmp_field_value.toUpperCase();
                filter_field_to_value[field_name] = tmp_field_value;
            }
            some_filter = (tmp_field_filter_applied) ? true : some_filter;
        }
        
        // If no filter has been used, then let's just spit out an unfiltered result
        if(!some_filter) return original_result;
        
        // Some filter has been applied
        // Loop overy result item
        original_result.forEach((x_result) => {
            let x_include_item = true;

            // Loop over each field within a result item
            // Note: .every continues until items are exhausted or if 'false' is returned
            Object.entries(filter_field_to_value).every( ([field, field_value]) => {
                // If filter is not set, then skip the check entirely
                if(field_value === "") return true;

                // Get the field within that result item
                let result_value = x_result[field];
                if(!this.case_sensitive_filter) result_value = result_value.toUpperCase();
                if(!result_value.includes(field_value)) x_include_item = false;
                return x_include_item;
            })
            if(x_include_item) filtered_result.push(x_result);
        });
        return filtered_result;
    }
    
    async fetchResult() {
        let result = '';

        // If auto_fetch is disabled, then just return the existing result cache as is
        if(!this.auto_fetch) result = this.LATEST_SEARCH_RESULT;

        // If auto_fetch is enabled, then ping the API for new information & store it in the cache
        else {
            const search_params = this.getQueryValueMap();
            Object.entries(this.request_params).forEach(([q_arg,value]) => search_params[q_arg] = value);
                
            let tmpURL = this.search_URL + '?' + new URLSearchParams(search_params);
            await fetch(tmpURL, {
                method : 'GET',
                credentials: 'include',
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                    'X-CSRFToken' : this.csrf_token
                }
            }).then(
                (response) => (response.ok ? response.json() : Promise.reject(response) )
            ).then(
                (data) => (result = data)
            ).catch(
                (error) => alert(`An error occured: ${error}! Please contact the developer`)
            )
            this.LATEST_SEARCH_RESULT = result;
        }

        // Filter the existing fields on the parameters given
        // Note that if autofetch = True, the API will typically returned a filtered response anyway
        // But if autofetch = False, the search_URL may be hitting a static JSON file so filtering would have to be front-end
        // In either case, without assuming the specifics of the implementation, call filterExistingResult on the result we have now
        result = this.filterExistingResult(result);
        return result;
    }
                    
    updateResults = () => {
        this.UPDATE_REQUESTED = false;
        this.fetchResult().then((result) => {
            // If auto_fetch is on, then result contains info retrieve from API and we ought to save it
            if(this.auto_fetch) this.LATEST_SEARCH_RESULT = result;
            this.renderSearchResults(result);
        });
    }
                    
    renderSearchResults(result) {
        // Clean the result_div
        this.result_container.innerHTML = "";

        // Re-populate result_div with LATEST_SEARCH_RESULT items
        let result_count = 0;
        result.every( (result) => {
            this.result_container.appendChild(this.createRow(result));
            result_count += 1;
            if(result_count > this.max_items) return false;
            return true;
        });
        if(result_count === 0) {
            let tmp_txt = document.createElement("h5");
            tmp_txt.textContent = "No results found";
            this.result_container.appendChild(tmp_txt);
        }
    }
}