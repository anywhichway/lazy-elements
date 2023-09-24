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