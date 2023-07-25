# js-DynamicSearch
A module for creating responsive search components.

## Introduction
While working on a project recently, I found myself recycling the same piece of code. Several views on my web application required a responsive search, each with slight variations. Some of these had to hit an API endpoint to fetch data in response to changes on an input element, whereas other views would load with a pre-populated cache and the responsive search had to filter for relevant items from this cache. With slightly varying API endpoints, query parameters, number of items to render, the exact design of rendering, this became quite tedious very quickly. js-DynamicSearch was created to solve this problem: to provide a high level abstract interface to quickly create, manage and design responsive search components for the web. 

I realise that this is not a unique module; however, the other modules I found to solve this had other dependencies, or imposed design restrictions on how the search component would be rendered. As a result, I created this for myself.

The structure of the module enables a flexibility with the rendering method - we can change the "view style" without refreshing the page, seamlessly moving between a table, cards, a simple colour-based view, and a dropdown search bar style. 

## Restrictions (with Potential Fixes)
1. This module can only handle JSON. 
**Possible improvement:** This restriction can be changed by modifying `fetchResult` function in the source code, by adding an intermediate layer to process other formats and reduce them to JSON. However, it is important that the result be reduced to JSON as the result is stored in a cache, and the filtering functions depend on the result ultimately being JSON. If required, we can just allow a custom handler to be provided for the result in the initial `config` object itself - this handler will act on the result of the fetch and will output JSON, allowing multiple source formats to be supported.

2. In case `autoFetch = true`, the module assumes that the API will process the query parameters and return a filtered result. In case of `autoFetch = false`, the module runs its own string matching (case-sensitivity can be managed via `case_sensitive_filter` attribute)

3. In case `autoFetch = false`, the initial cache has to be initialised using `ready` method before `autoFetch` is set to `false`!

## Terminology
I use `field` to refer to a single search variable, `row` or `item` to refer to a search result which contains one or more fields, `container` to refer to the element where all such `row`s or `item`s are rendered.

## Initialising
The class DynamicSearch expects a `config` object with the following parameters defined:

1. **search_URL**
    This can be a URL to a static JSON file or an API endpoint which serves JSON in response to the query parameters.

    **Note:** In case of this pointing to a static file:
        - the `autoFetch` attribute has to be set to `false`. Static files are typically cached by the client, so this is not done with the purpose of repeated requests. Rather, when `autoFetch` is set to `true`, then the module assumes that the result retrieved is already filtered on the query parameters - so if static files are used, then `autoFetch = true` will never filter these and just show the first `maxItems` items. `autoFetch = false` will manually run `filterResults` on the initial cache before rendering them.
        - The initial cache has to be set using `fetchResult` and `renderResult` before turning `autoFetch` off - there is no neat mechanism for this right now.


2. **query_input_elements_map**
    This is a JSON object with entries of (`query_param`, `input_element`) form.
        - `query_param` (String): The corresponding `input_element`'s value will be sent to the API endpoint under this key
        - `input_element` (DOM Node): The input element to watch for changing state, for the given `query_param` parameter.

3. **result_container**
    This is the DOM Node inside which the results will be rendered.

4. **row_container**
    This is a JSON object, with the following entries:
        - `element` : Type of HTML Element in which one single result item will be rendered
        - `classes` : List of classes to apply on the corresponding HTML element

### Other Variables
These variables can only be set after initialising a DynamicSearch object:

1. **field_handlers**
    This is a JSON object, containing a (`query_param`, `handler`) entry for each input field. 
    
    - The `query_param` value should be the same as the one specified in `query_input_elements_map`,
    - The `handler` should be a function which takes in two parameters, field `key` and field `value`, and should output an Element that constructs the UI representation of the (`field`, `value`) pair, where `field` is hardcoded, but `value` varies for every `row`/`item`.


2. **item_handler**:
    This is a function which takes in `row_element` and `result`, and returns a processed `row_element`
        - `row_element` is the DOM Node of tag `row_container.element` type, containing, for each field, `field_handler(field, value)` elements
        - `result` is the JSON object that was used to construct `row_element` with its `field`s

    **Use Cases**:
    While `field_handler`s can only use & represent information from individual variables, `item_handler` has access to the container element as well as data from the entire search item. My personal use cases for this have included:
        1. To set a class on the `row_container` element for the result depending on the specific result and state (such as, if rendering inventory, to set a particular class if that particular item is already in cart, or if that item is out of stock)
        2. To add a derived variable (eg. using price of the item + the quantity of the item added, compute a field to show the Total Cost of the item)

3. **max_items**
    The upper bound on the number of `item`s which will be rendered in `result_container`


4. **requestParams**
    This is a JSON object containing (`key`, `value`) pairs, where `key` is the name of the parameter and `value` is the value that the parameter takes. These are **invariants** which are independent of the query results, can be used to arbitrary data to API endpoints (authorization key, or set the same `maxItems` bound on data retrieved from API endpoint so as to not use server resources unnecessarily).


----- 
## To-Do List
1. Standardise variable names and improve documentation (`max_items` has the setter `maxItems`) - still pretty new to JavaScript, so not sure about the best practices to structure my code. Worth a revisit soon.
2. Add handler to pre-process result before storing in cache and rendering - this would make it possible to accept non-JSON data as well
3. Improve code for handling static file data. Right now, the data has to be fetch through `ready()` method, then `autoFetch` has to be set to `false` - if we included autoFetch in the initial configuration, then we can call `ready()` at initialisation - however, `ready()` calls `renderSearchResult` which uses `item_handler` and `field_handler`, which are also not set in initial configuration. Part of the appeal is to be able to change the view without having to reload the page (As demonstrated in the demo) - so not sure how to improve this
4. Add some critical callbacks for developers, such as:
    - OnInputReceived
    - OnDataFetch
    - OnFilterComplete
    - OnRenderStart
    - OnRenderComplete

    This can be quite useful