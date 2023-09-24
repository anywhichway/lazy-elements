import {createNavigationHandler, createPopStateHandler, wire} from "./wired-elements.js";
class WiredHistory {

    #position = 0;
    #history = [];
    #target;

    constructor(target) {
        this.#target = target;
    }

    get state() {
        return this.#history[this.#position]||this.#history[0];
    }

    get length() {
        return this.#history.length;
    }

    back(pop=true) {
        if(this.#position>0) {
            this.#position--;
            if(pop) this.#target.dispatchEvent(new PopStateEvent("popstate",{state:this.state}));
        }
    }
    forward(pop=true) {
        if(this.#position<this.length-1) {
            this.#position++;
            if(pop) this.#target.dispatchEvent(new PopStateEvent("popstate",{state:this.state}));
        }
    }
    go(count) {
        if(count<0) while(cout++<0 && this.#position>0) this.back();
        else while(count-->0 && this.#position<this.length-1) this.forward()
    }
    pushState(state) {
        this.#history.push(state);
    }
    replaceState(state) {
        this.#history[this.#position] = state;
    }
}
class WiredFrame extends HTMLElement {

    #history;

    static define() {
        customElements.define("wired-frame",WiredFrame);
    }
    constructor(body) {
        super();
        this.attachShadow({mode: 'open'});
        this.#history = new WiredHistory(this.shadowRoot);
    }
    connectedCallback() {
        const target = this.getAttribute("target"),
            options = {root:this.shadowRoot,history:this.#history,target:target||"_self"};
        this.shadowRoot.addEventListener("click",createNavigationHandler(options));
        this.shadowRoot.addEventListener('popstate',createPopStateHandler(this.#history));
        this.addEventListener("back",(event) => { event.stopPropagation(); this.back(); });
        this.addEventListener("forward",(event) => { event.stopPropagation(); this.forward(); });
        const src = this.getAttribute("src");
        if(src) {
            fetch(src).then(async (response) => this.shadowRoot.innerHTML = await flexParse(response))
        } else {
            this.shadowRoot.innerHTML = this.innerHTML;
            this.innerHTML = "";
            wire(this.shadowRoot,{history:this.#history,root:this.shadowRoot});
        }
    }
    back() {
        this.#history.back();
        wire(this.shadowRoot,{history:this.#history,root:this.shadowRoot});
    }
    forward() {
        this.#history.forward();
        wire(this.shadowRoot,{history:this.#history,root:this.shadowRoot});
    }
    go(count) {
        this.#history.go(count);
        wire(this.shadowRoot,{history:this.#history,root:this.shadowRoot});
    }
}


export {WiredFrame,WiredFrame as default}