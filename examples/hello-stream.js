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