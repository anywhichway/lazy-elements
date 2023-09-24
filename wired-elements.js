const walk = (node,callback,level=0) => {
    if(node.nodeType==Node.TEXT_NODE) {
        if(callback) callback(node);
    } else {
        if(node.nodeType==Node.ELEMENT_NODE) for(const attr of [...node.attributes]) !callback || callback(attr,level)
        if(callback) callback(node,level);
        for(const child of [...node.childNodes]) walk(child,callback,level+1);
        if(node.nodeType==Node.ELEMENT_NODE && !(node instanceof HTMLElement)) {
            const htmlNode = document.createElement(node.tagName);
            for(const attr of [...node.attributes]) {
                if(attr.name!=="xmlns") htmlNode.setAttribute(attr.name,attr.value);
            }
            htmlNode.append(...node.childNodes);
            node.replaceWith(htmlNode);
            node = htmlNode;
        }
    }
    if(node instanceof XMLDocument) {
        const newNode = document.createElement("div");
        newNode.append(...node.childNodes);
        node = newNode;
    }
    return node;
}

const parser = new DOMParser(),
    flexParse = (item,allowedTypes=["text/xml","text/html"]) => {
        const type = typeof item;
        if(type==="boolean" || type==="number" || type==="bigint") return item;
        if(type==="string") {
            if(allowedTypes.includes("application/json")) {
                try {
                    return JSON.parse(item);
                } catch(e) {
                    if(throws) throw e;
                    return "";
                }
            }
            if(allowedTypes.includes("text/xml")) {
                const node = parser.parseFromString(item, "text/xml");
                if(node.querySelector("parsererror")) {
                    if(allowedTypes.includes("text/html")) return parser.parseFromString(item, "text/html").body.innerHTML;
                } else if(allowedTypes.includes("text/html")) {
                    return walk(node).innerHTML;
                }
            }
            if(allowedTypes.includes("text/html")) {
                return parser.parseFromString(item, "text/html").body.innerHTML;
            }
            throw new TypeError(`Unable to parse ${type}`);
        }
        if(item && type==="object" && item instanceof Response) {
            if(item.status!==200) return flexParse(item.statusText);
            const contentType = item.headers.get("Content-Type");
            if(contentType.includes("text/html") || !contentType) return item.text().then((text) => flexParse(text));
            else return item.text().then((text) => flexParse(text,[contentType]));
        }
        throw new TypeError(`Unable to parse ${type}`);
    }

const insertContent = ({el,content,defaultTarget,history,root}) => {
    const value = el.getAttribute("target") || defaultTarget || "_self",
        [target,...rest ] = value.split("."),
        selector = rest.join(".");
    if(target === "_top") {
        if(selector)  console.warn(`Ignoring selector ${selector} for target ${target}`);
        const dom = parser.parseFromString(content, "text/html");
        document.head.innerHTML = dom.head.innerHTML;
        document.body.innerHTML = dom.body.innerHTML;
        wire(document.body,{history:window.history,root:document.documentElement});
    } else if (target.startsWith("_body.") || ["_beforebegin","_afterend","_parent"].includes(target)) {
        observer.observe(document.body,{childList:true,subtree:true});
        if(target==="_beforebegin") {
            const element = el.host || el;
            if (typeof content === "string") {
                element.insertAdjacentHTML("beforebegin", content);
                wire(node.previousElementSibling, {history, root});
            } else {
                element.insertAdjacentText("beforebegin", JSON.stringify(content));
            }
        } else if(target==="_afterend") {
            const element = el.host || el;
            if (typeof content === "string") {
                element.insertAdjacentHTML("afterend", content);
                wire(element.nextElementSibling, {history, root});
            } else {
                element.insertAdjacentText("afterend", JSON.stringify(content));
            }
        } else {
            el = target.startsWith("_body.") ? document : root.host?.parentElement?.shadowRoot || root.host?.parentElment || document;
            if(selector) {
                const nodes = selector[0]==="#" ? [el.getElementById(selector.substring(1))] : [...el.querySelectorAll(selector) || []]
                for (const node of nodes) {
                    if (typeof content === "string") node.innerHTML = content;
                    else node.innerText = JSON.stringify(content);
                    wire(node,{history,root});
                }
            } else {
                el = el === document ? document.body : el;
                if(typeof content === "string") el.innerHTML = content
                else el.innerText = JSON.stringify(content);
                wire(el.shadowRoot||el,{history,root});
            }

        }
        const changes = observer.takeRecords();
        if(changes.length>0) {
            window.history.previousState = window.history.length;
            window.history[window.history.length] = changes;
            window.history.pushState(window.history.length,null,document.location);
            window.history.forward(false);
        }
        observer.disconnect();
    } else {
        observer.observe(el.body||el,{childList:true,subtree:true});
        if(target.startsWith("_self")) {
            if(selector) {
                const doc = el.host && el instanceof DocumentFragment ? el : document,
                    nodes = selector[0]==="#" ? [doc.getElementById(selector.substring(1))] : [...el.querySelectorAll(selector) || []]
                for (const node of nodes) {
                    if(typeof content === "string") node.innerHTML = html
                    else node.innerText = JSON.stringify(content);
                    wire(node,{history,root});
                }
            } else {
                if(typeof content === "string") (el.body||el).innerHTML = content
                else el.innerText = JSON.stringify(content);
                wire(el,{history,root});
            }
        } else if(["_afterbegin","_beforeend"].includes(target)) {
            if(target==="_afterbegin") {
                if(typeof content === "string") node.insertAdjacentHTML("afterbegin",content)
                else node.insertAdjacentText("afterbegin",JSON.stringify(content));
                wire(node.firstElementChild,{history,root});
            } else if(target==="_beforeend") {
                if(typeof content === "string") node.insertAdjacentHTML("beforeend",content)
                else node.insertAdjacentText("beforeend",JSON.stringify(content));
                wire(node.lastElementChild,{history,root});
            }
        } else {
            const nodes = (root||el).querySelectorAll(target) || [];
            for (const node of nodes) {
                if(typeof content === "string") node.innerHTML = content
                else node.innerText = JSON.stringify(content);
                wire(node,{history,root});
            }
        }

        const changes = observer.takeRecords();
        if(changes.length>0) {
            history.previousState = history.length;
            history[history.length] = changes;
            history.pushState(history.length,null,document.location);
            history.forward(false);
        }
        observer.disconnect();
    }
}

const wire = (element,{history,root}) => {
    const id = element.id ||= Math.random().toString(36).substring(2,15);
    for(const el of [...element.querySelectorAll("[data-stream]")]) {
        const src = el.getAttribute("data-stream");
        import(new URL(src,document.baseURI).href).then((module) => {
            el.addEventListener("message",(event) => {
                const content = flexParse(event.detail||event.data);
                event.dataStream = (new URL(src,window.location)).href;
                insertContent({el,content,history,root});
            });
            el.addEventListener("subscribe",(event) => module.subscribe(el));
            el.addEventListener("unsubscribe",(event) => module.unsubscribe(el));
            if(el.getAttribute("data-subscribe")==="false") return;
            module.subscribe(el);
            el.subscribe = function() {
                el.dispatchEvent(new CustomEvent("subscribe",{detail:(new URL(src)).href,bubbles:true,cancelable:false,composed:true}));
            }
            el.unsubscribe = function() {
                el.dispatchEvent(new CustomEvent("subscribe",{detail:(new URL(src)).href,bubbles:true,cancelable:false,composed:true}));
            }
        });
    }
    const promises = [],
        sourced = [...element.querySelectorAll("[data-src]")];
    for(const el of sourced) {
        const src = el.getAttribute("data-src");
        fetch(src).then(async (response) => {
            const content = await flexParse(response);
            insertContent({el,content,history,root});
            if(el.hasAttribute("data-controller")) activateController(el)
        });
    }
    for(const el of [...element.querySelectorAll("[data-controller]")]) {
        if(!sourced.includes(el)) activateController(el);
    }
}

function activateController (el) {
    const controller = el.getAttribute("data-controller");
    import(new URL(controller,document.baseURI).href).then((module) => {
        if(!el.isConnected) return;
        for(const [key,value] of Object.entries(module)) {
            const type = typeof value;
            if(type === "function") {
                if(key.startsWith("on")) el.addEventListener(key.substring(2),value.bind(el))
                else el[key] = value;
            } else if(key==="targets") {
                const selectorBase = el instanceof HTMLInputElement ? el.parentElement : el.shadowRoot || el;
                Object.entries(value).forEach(([key,value]) => el[key] = value[0]==="#" && !selectorBase.host ? document.getElementById(value.substring(1)) : selectorBase.querySelector(value))
            }
        }
        walk(el,(node,level) => {
            if(node.nodeType===Node.ELEMENT_NODE && (level===0 || !node.hasAttribute("data-controller"))) { // chck to make sure it is not also a controller
                for(const attr of node.attributes) {
                    if(attr.name.startsWith("on")) {
                        const event = attr.name.substring(2);
                        if(attr.value.startsWith("this.")) {
                            const fname = attr.value.substring(5);
                            if(typeof el[fname] !== "function") {
                                console.warn(`Unable to find function ${fname} on ${el.tagName} for event ${event}`);
                            } else {
                                node.addEventListener(event,el[fname].bind(el));
                                node.removeAttribute(attr.name);
                            }
                        } else if(attr.value[0]==="#") {
                            const [id,fname, ...rest] = attr.value.split(".");
                            if(rest.length===0) {
                                if(typeof el[fname] !== "function") {
                                    console.warn(`Unable to find function ${fname} on ${el.tagName} for event ${event}`);
                                } else {
                                    const child = node.querySelector(id);
                                    if(!child) {
                                        console.warn(`Unable to find element ${id} for event ${event} and child of ${el.tagName}`);
                                    } else {
                                        child.addEventListener(event, el[fname].bind(el));
                                        node.removeAttribute(attr.name);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
    });
}

const wiredRouter = ({router,allowRemote= false,root=document,all=(c) => fetch(c.req.raw)}={}) => {
    router.get("*",async (c,next) => {
        const url = new URL(c.req.url,document.baseURI),
            node = root.querySelector(`[data-href="${allowRemote ? c.req.url : url.pathname}"]`);
        if(node) {
            const headers = {"content-type":"text/html"};
            for(const attr of [...node.attributes]) {
                if(attr.name.startsWith("data-header-")) headers[attr.name.substring(12)] = attr.value;
                else if(attr.name==="data-headers") Object.assign(headers,JSON.parse(attr.value))
            }
            return new Response(node.innerHTML,{headers});
        }
        await next();
    });
    if(all) router.all("*",all);
    return router;
}

const observer = new MutationObserver((changes) => {
    //console.log(changes);
});
function createNavigationHandler ({root,history=window.history,target="_self",router=window}={}){
    const el = root || document.documentElement;
    history.offset ||= history.length;
    observer.observe(el.body||el,{childList:true,subtree:true});
    wire(el,{history,root});
    const changes = observer.takeRecords();
    history.previousState = history.offset;
    history[history.previousState] = changes;
    history.pushState(history.previousState,null,document.location);
    history.forward();

    observer.disconnect();
    return function(event) {
        const anchor = event.composedPath().find(({tagName}) => tagName === 'A'),
            form = event.composedPath().find(({tagName}) => tagName === 'FORM');
        if (!anchor && !form) return;
        let request;
        if (anchor) {
            const url = new URL(anchor.href);
            if (url.origin === location.origin) request = new Request(url, {signal: event.signal});
        } else if (form && event.type==="submit") {
            let url = form.action;
            const options = {
                method: form.method,
                signal: event.signal
            };
            if (form.method === "POST" || form.method === "PUT") options.body = new FormData(form);
            else url += "?" + new URLSearchParams(new FormData(form));
            request = new Request(url, options);
        }
        if (request) {
            event.preventDefault();
            event.stopImmediatePropagation();
            (async () => {
                const response = await router.fetch(request),
                    content = await flexParse(response);
                insertContent({el:anchor||form,content,defaultTarget:target,history,root:el});
            })()
        }
    }
}

function createPopStateHandler(history=window.history) {
    return (event) => {
        const state = event.state; //event.state < history.offset ? history.offset :
        if(typeof state=== "number" && state>=history.offset) {
            for (const {
                target,
                addedNodes,
                removedNodes,
                nextSibling,
                previousSibling
            } of history[state > history.previousState ? state : history.previousState]||[]) {
                if(state > history.previousState) {
                    for(const node of removedNodes) node.remove();
                    if (previousSibling) previousSibling.after(...addedNodes);
                    else if (nextSibling) nextSibling.before(...addedNodes);
                    else target.append(...addedNodes);
                } else {
                    for(const node of addedNodes) node.remove();
                    target.append(...removedNodes);
                }
            }
            if(history[state]) history.previousState = state;
        } else {
            if(state===null) {
                for(const {target,addedNodes,removedNodes} of history[history.offset+1]||[]) {
                    for(const node of addedNodes) node.remove();
                    target.append(...removedNodes);
                }
            }
            history.previousState = history.offset;
            history.back()
        }
    }
}

const enable =(options={}) => {
    window.addEventListener("DOMContentLoaded",() => {
        window.addEventListener('click', createNavigationHandler(options));
        window.addEventListener('submit', createNavigationHandler(options));
        window.addEventListener('popstate',createPopStateHandler());
    });
}

export { wiredRouter, enable, createPopStateHandler, createNavigationHandler, wire}