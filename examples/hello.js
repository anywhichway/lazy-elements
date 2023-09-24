const targets= {
    greeting: '[data-property="greeting"]',
    name: 'input[name="name"]',
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