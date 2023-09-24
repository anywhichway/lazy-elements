# lazy-elments v0.0.1-a

Single page apps with minimal custom JavaScript or client build processes. Similar to [Turbo](https://turbo.hotwired.dev/)
and [Stimulus](https://stimulus.hotwired.dev/), but less opinionated and with a router and some other goodies.

- [x] Router: The router can load any HTML element with a `data-href` attribute as though it was delivered by a server.
- [x] Anchors, forms, and `<lazy-frame>` can all target `beforebegin`, `afterbegin`, `beforeend`, `afterend`, `_self`, 
`_parent`, `_body`, `_top` or a CSS selectable target.
- [x] Updates can be multi-targeted through the use of CSS selectors that return multiple nodes.
- [x] Streams have event handlers for subscribing and unsubscribing.
- [x] Simple controllers, no subclassing and less name aliasing is necessary.

## Installation

```bash
npm install lazy-elments
```

Then use the two files `lazy-elments.js` and `lazy-frame.js` in the root directory.

## Enabling Lazy Elements

This module code should be included in your HTML. It adds about 3K to your page.

```javascript
import {enable} from "./lazy-elments.js";
enable();
```

## Loading Files As Content
    
```html
<div data-src="/path/to/element.html"></div>
``` 

will load the contents of `element.html` as the inner HTML of the div.

## Anchor and Form Targets

Anchor elements and forms can target `_beforebegin`, `_afterbegin`, `_beforeend`, `_afterend`, `_self`, `_parent`, `_top` 
`_blank` or a CSS selectable target.

The targets `_self`, `_parent` and `_body` can also have a `.<css-selector>` suffix. This means you can update multiple 
elements with a single anchor or form submission.

If the `css` selector is prefixed with `#`, it is assumed to be a single id and the target is selected using
`document.getElementById(id)` or `shadowRoot.getElementById(id)`. Otherwise, the target(s) are selected using 
`querySelectorAll` per below:

- `_self.<css>` is effectively `this.querySelectorAll(<css>)`
- `_parent.<css>` is effectively `this.parentElement.querySelectorAll(<css>)`
- `_body.<css>` is effectively `document.querySelectorAll(<css>)`

## Targets On Other Elements

Targeting is also possible for other elements that may be dynamically updated, e.g. those with `data-stream` attributes.
In this case, the custom attribute `data-target` can be added and the same resolution principles apply as for anchors 
and forms. If missing, `data-target` defaults to `_self`, i.e. the `innerHTML` of the element.

## Form Processing

Form submissions are intercepted and processed by `lazy-elments`. The form is submitted using `fetch` and the response
is used to update the target(s) of the form.

## Streaming Content

```html
<div data-stream="/path/to/stream.js"></div>
```

The div's `data-target` (which defaults to its `innerHTML`) will automatically be updated with the contents of the event 
`details` or `data` based on receipt of the browser event `message`. 

The stream should expose `subscribe` and `unsubscribe` methods that accept an element as an argument, for example:

```javascript
let interval;
const subscribe = (element) => {
    interval = setInterval(() => {
        element.dispatchEvent(new CustomEvent("message",{detail:"Hello, World! " + new Date().toLocaleTimeString()}));
    },10000);
};
const unsubscribe = (element) => {
    if(interval) clearInterval(interval)
}
export {subscribe,unsubscribe}
````

The element will be modified to handle `subscribe` and `unsubscribe` events locked to the specified `data-stream`. It will 
also be modified to have `subscribe` and `unsubscribe` methods that post messages to itself to subscribe and unsubscribe.

### Treating Templates As Files

If a lazy element router is provided when `enable` is called, then templates (or any other elements with a `data-href` attribute) 
can be treated as files. This is useful for creating true single page apps or for testing the client with stubbed out
responses when a server is not available.

```html
<script type="module">
import {Hono} from "https://esm.sh/hono"; // a base router is required, only Hono has been tested at this time
import {enable,lazyElementRouter} from "./lazy-elments.js";
enable({router:lazyElementRouter({router:new Hono()})})
</script>

<template data-href="/path/to/element.html">
    My Template As Pseudofile
</template>
<div data-src="/path/to/element.html"></div>
``` 

Will render as:

```
My Template As Pseudofile
```

## Lazy Element Controllers

A controller is a JavaScript module that is associated with a single element. It is not a class and does not need to be
instantiated. It is simply a module that exports:

1) event handlers like `onclick`, which are actually added by `lazy-elments` by using `addEventListener`
2) functions that can be bound to event handlers declared in HTML, e.g. `onclick="this.greet"`
3) A `targets` object that maps the names of targets to CSS selectors. These will typically correspond to the value of 
an attribute like `data-property` on an element, but they can actually match anything that `querySelector` can match.
The keys of the `targets` object are used to create properties on the controlled HTML element that are bound to the matching elements.

```html
<div data-controller="hello.js">
    <input name="name" type="text">
    <button onclick="this.greet">Submit</button>
    <span data-property="greeting"></span>
</div>
```

```javascript
const targets= {
    greeting: '[data-property="greeting"]',
    name: 'inout[name="name"]',
};

function greet() {
    this.greeting.textContent = `Hello, ${this.name.value}!`;
}

function onclick(event) {
    console.log(event)
}

export {
    targets,
    greet,
    onclick
}
```

Custom controllers can be added to forms to support validation. However, submission handling will still be done by 
`lazy-elments` unless no submit button is provided or the controller implements its own fetch approach.

```html
<form data-controller="hello.js">
    <input name="name" type="text">
    <button type="submit">Submit</button>
    <span data-property="greeting"></span>
</form>
```

It is even possible to add controllers to specific input elements within a form. In this case the CSS selectors in the `targets`
will be relative to parent of the input element.

```html
<form>
    <span><input name="name" type="text" data-controller="./validate-name.js"><span id="#input-error"></span></span>
    <button>Submit</button>
    <span data-property="greeting"></span>
</form>
```

```javascript
const targets = {
    "nameError": "#name-error"
}
function onchange(){
    var name = this.value;
    if(name.length < 5){
        this.nameError.innerHTML = "Name must be at least 5 characters long";
    }else{
        this.nameError.innerHTML = "";
    }
}

export {
    onchange,
    targets
}
```

The above is somewhat blunt, but it demonstrates the ability to add controllers to specific elements within a form. See
the [MDN documentation on form validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation) for more 
information on how to do this properly.

## Combining Lazy Element Attributes

Attributes can be combined to create more complex behavior.

```html
<div data-controller="hello.js" data-src="./hello.html"></div>
```

## LazyFrames

Lazy frames are custom elements that isolate their own CSS and JavaScript. They share a router with the main document but maintain
their own forward and back history. In many ways they operate like an `iframe`, but without the security restrictions.

Lazy frames need to be separately enabled:

```html
<script type="module">
    import {Hono} from "https://esm.sh/hono";
    import {enable,lazyElementRouter} from "./lazy-elments.js";
    import {LazyFrame} from "./lazy-frame.js";
    LazyFrame.define(); // or customElements.define("my-lazy-frame-tag-name",LazyFrame);
    enable({router:lazyElementRouter({router:new Hono()})});
</script>
```

The initial content of a lazy frame is specified as its inner HTML. The HTML can include the use of Lazy Elements attributes.

Templates for resolving `data-src` attributes through the use of `data-href` should not be used as part of the content of
Lazy frames. They are only accessible to the router if specified as part of the top level document.

Currently, `lazy-frame` does not support nesting.

Dynamic updates to the `innerHTML` of a `lazy-frame` have no impact because the content is actually rendered in a `shadoDOM`
and the content is controlled by the original `innerHTML` of the element.

```html
<lazy-frame>
    <div>My Lazy Frame</div>
    <div data-src="/path/to/element.html"></div>
</lazy-frame>
```

Lazy frames can respond to `back` and `forward` events. They can also be navigated programmatically by calling the
methods `back()` or `forward()` when accessed from JavaScript.

# Change History (Reverse Chronological Order)

2023-090-24 v0.0.1-a Initial Release. History is not tracking changes properly.


