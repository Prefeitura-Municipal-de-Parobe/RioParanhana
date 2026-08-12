const toggleButton =  document.querySelector(".dark-theme-toggle-button");

const darkComponents = [
    toggleButton,
    document.querySelector('#header'),
    document.querySelector('#page-body'),
    document.querySelector('#video-wrapper'),
    document.querySelector('#info-container'),
    document.querySelector('#footer'),
    document.querySelector('#noc'),
    document.querySelector('#temp-atual'),
    document.querySelector('#sens-term'),
    document.querySelector('#dire-vento'),
    document.querySelector('#velo-vento'),
    document.querySelector('#noc-prec'),
    document.querySelector('#noc-meter'),
    document.querySelector('#api-rain-fill'),
    document.querySelector('#noc-regua-container'),
];


toggleButton.addEventListener('click', () => {
    let isLight = toggleButton.classList.contains("light");

    darkComponents.map((component) => {
        if(isLight){
            toggleButton.innerHTML = `
                <i class="bi bi-sun"></i>
            `;
            component.classList.remove("light");
            component.classList.add("dark");
        } else {
            toggleButton.innerHTML = `
                <i class="bi bi-moon"></i>
            `;
            component.classList.remove("dark");
            component.classList.add("light");
        }
    });
});