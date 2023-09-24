const evaluateScripts = (scripts) => {
    const defer = [];
    for(const script of scripts) {
        const newscript = document.createElement("script");
        newscript.innerHTML = script.innerText;
        for(const attr of script.attributes) {
            newscript.setAttribute(attr.name,attr.value);
        }
        if(script.getAttribute("type")==="module") defer.push([script,newscript]);
        else script.replaceWith(newscript);
    }
    for(const [script,newscript] of defer) script.replaceWith(newscript);
}
