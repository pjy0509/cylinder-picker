import packageJSON from '../package.json';
import {GlobalThis} from "./utils";
import {ExtendedMouseEvent, ExtendedTouchEvent} from 'eventlistener-manager';

export class CylinderPickerEvent extends Event {
    value: number;
    elementValue: HTMLLIElement;

    constructor(liElements: NodeListOf<HTMLLIElement>, value: number) {
        super('change');
        this.value = value;
        this.elementValue = liElements[this.value];
    }
}

export class HTMLCylinderPicker extends HTMLElement {
    static TAG = 'cylinder-picker';
    static version = packageJSON.version;

    private observer: MutationObserver | undefined;
    private cylinder: HTMLElement | undefined;
    private loopSize = 0;
    private isRendering = false;

    private inertiaPan: (() => Promise<void>) | undefined;
    private animationEndCallback: (() => void) | undefined;
    private onMouseAndTouchPanMove: ((event: Event) => Promise<void>) | undefined;
    private onMouseAndTouchPanEnd: (() => void) | undefined;
    private onWheel: ((event: Event) => Promise<void>) | undefined;

    private $inertiaPanCallback: (() => any) | undefined;
    private $isAnimating = false;
    private $length = 0;
    private $value: number = 0;
    private $curvature: number = 20;
    private $disabled: boolean = false;
    private $infinite: boolean = false;

    get elementValue(): HTMLLIElement {
        return this.querySelectorAll('li')[this.value];
    }

    get length() {
        return this.$length;
    }

    get isAnimating() {
        return this.$isAnimating;
    }

    get value() {
        return this.$value;
    }

    set value(value: number) {
        this.$value = value;
        this.render(value);
    }

    get curvature() {
        return this.$curvature;
    }

    set curvature(value: number) {
        this.$curvature = value;
        this.render();
    }

    get disabled() {
        return this.$disabled;
    }

    set disabled(value: boolean) {
        this.$disabled = value;
        this.render();
    }

    get infinite() {
        return this.$infinite;
    }

    set infinite(value: boolean) {
        this.$infinite = value;
        this.render();
    }

    set list(values: string[]) {
        this.innerHTML = ``;

        let html = ``;
        for (const value of values) {
            html += `<li>${value}</li>`;
        }

        this.innerHTML += html;
    }

    set inertiaPanCallback(value: (() => Promise<void>)) {
        this.$inertiaPanCallback = value;
    }

    getAttributeBoolean(qualifiedName: string) {
        return this.hasAttribute(qualifiedName) && this.getAttribute(qualifiedName) !== 'false';
    }

    getAttributeNumber(qualifiedName: string, defaultValue: number) {
        if (this.hasAttribute(qualifiedName)) {
            const value = Number(this.getAttribute(qualifiedName)!);
            if (isNaN(value)) {
                return defaultValue;
            } else {
                return value;
            }
        }
        return defaultValue;
    }

    connectedCallback() {
        this.attachShadow({mode: 'open'});

        this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
        this.observer.observe(this, {
            childList: true,
            subtree: true,
            attributes: true
        });

        this.value = this.getAttributeNumber('value', 0);
        this.curvature = this.getAttributeNumber('curvature', 20);
        this.disabled = this.getAttributeBoolean('disabled');
        this.infinite = this.getAttributeBoolean('infinite');
    }

    disconnectedCallback() {
        this.observer?.disconnect();
    }

    static get observedAttributes() {
        return [];
    }

    private handleMutations(mutations: MutationRecord[]) {
        mutations.forEach((record) => {
            switch (record.type) {
                case 'attributes':
                    switch (record.attributeName) {
                        case 'value':
                            this.value = this.getAttributeNumber('value', 0);
                            break;
                        case 'curvature':
                            this.curvature = this.getAttributeNumber('curvature', 20);
                            break;
                        case 'disabled':
                            this.disabled = this.getAttributeBoolean('disabled');
                            break;
                        case 'infinite':
                            this.infinite = this.getAttributeBoolean('infinite');
                            break;
                        default:
                            break;
                    }
                    break;
                case 'childList':
                    this.render();
            }
        });
    }

    private getStyle() {
        const calculateCurvature = (nth: number) => {
            return Math.cos(nth * this.curvature * (Math.PI / 180));
        }

        const calculateOpacity = (nth: number) => {
            const curvature = calculateCurvature(nth);
            return Number((curvature / (Math.abs(nth) + 1) ** (1 / 2)).toFixed(2));
        }

        const calculateRotateX = (nth: number) => {
            const curvature = calculateCurvature(nth);
            return Number((Math.sign(nth) * (-100 + (50 * curvature * 2 ** curvature))).toFixed(2));
        }

        const calculatePaddingLeft = (nth: number) => {
            const curvature = calculateCurvature(nth);
            return Number((3 / 4 * (1 - curvature)).toFixed(2));
        }

        let visible = true;
        let i = 0;
        while (visible) {
            i++;
            visible = calculateOpacity(i) > 0 && Math.abs(calculateRotateX(i)) < 90;
        }

        const nextPadding = calculatePaddingLeft(1 + i);

        return `:host [data-cylinder] {top: 0;position: relative;display: inline-block;list-style: none;margin: 0 ${nextPadding}em 0 0;padding: 0;transition: opacity 0.1s;}:host [data-cylinder] [data-cylinder-depth]{opacity:0;transform:perspective(12.5em) rotateX(-90deg) translateX(${nextPadding}em);transform-origin: bottom left;}:host [data-cylinder] [data-cylinder-depth^="-"]{opacity:0;transform:perspective(12.5em) rotateX(90deg) translateX(${nextPadding}em);transform-origin: top right;}`
            + Array.from({length: i * 2 - 1}, (_, j) => j - i + 1)
                .map(e => `:host [data-cylinder] [data-cylinder-depth="${e}"]{opacity: ${Math.max(0, calculateOpacity(e))};transform: perspective(12.5em) rotateX(${Math.max(-90, Math.min(90, calculateRotateX(e)))}deg) translateX(${calculatePaddingLeft(e)}em);transform-origin: ${e < 0 ? `bottom right` : e > 0 ? `top right` : `unset`};}`)
                .join('');
    }

    static defineElement() {
        customElements.define(this.TAG, this);
    }

    private render(value: number = this.value) {
        this.didLoad()
            .then(() => {
                if (!this.shadowRoot) return;

                this.isRendering = true;

                const liElements = Array.from(this.querySelectorAll('li'));
                this.$length = liElements.length;

                this.shadowRoot.innerHTML = `
<style>
:host {
-webkit-user-select:none;
-moz-user-select:none;
-ms-user-select:none;
user-select:none;
}
:host [data-cylinder-container] {
margin-top: 0.2em;
position: relative;
height: 10.325em;
overflow: hidden;
width: fit-content;
}
:host [data-cylinder] {
top: 0;
position: relative;
display: inline-block;
list-style: none;
margin: 0;
padding: 0;
transition: opacity 0.1s;
}
:host [data-cylinder][data-cylinder-disabled] {
user-select: none;
opacity: 0.5;
}
:host [data-cylinder] li {
top: 0;
position: relative;
padding: 0.3125em 0.1875em;
font-size: 1em;
height: 1.1em;
cursor: pointer;
border-radius: 4px;
}
:host [data-cylinder] li:hover {
background-color: rgba(126,126,126,0.2);
}
:host [data-cylinder][data-cylinder-disabled] li:hover,
:host [data-cylinder] li[data-cylinder-padding]:hover {
background-color: unset !important;
cursor: unset !important;
}
${this.getStyle()}
</style>
<div data-cylinder-container>
<ul data-cylinder ${this.disabled ? 'data-cylinder-disabled' : ''}>
${
                    liElements
                        .map(li => {
                            const sheets = document.styleSheets;
                            const before = li.getAttribute('style');
                            let styles = '';

                            for (let i = 0; i < sheets.length; i++) {
                                try {
                                    const rules = sheets[i].cssRules || sheets[i].rules;

                                    for (let j = 0; j < rules.length; j++) {
                                        const rule = rules[j];

                                        if (rule instanceof CSSStyleRule && li.matches(rule.selectorText)) {
                                            const content = rule.style as any;
                                            styles += content.cssText;
                                        }
                                    }
                                } catch {
                                }
                            }

                            if (before) {
                                styles = styles + before;
                            }

                            li.setAttribute(
                                'style',
                                Object.entries(
                                    styles
                                        .split(';')
                                        .filter(string => string)
                                        .map(string => {
                                            const split = string.split(':');
                                            const key = split.splice(0, 1).join('').trim();
                                            const value = split.join('').trim();
                                            const important = value.endsWith('!important');
                                            return {key, value, important}
                                        })
                                        .reduce((current: any, previous) => {
                                            if (previous.important || !current[previous.key]) {
                                                current[previous.key] = previous.value
                                            }
                                            return current
                                        }, {})
                                )
                                    .map(entry => entry[0] + ':' + entry[1] + ';')
                                    .join('')
                            );

                            return li.outerHTML
                        })
                        .join('')
                }
</ul>
</div>
`

                this.cylinder = this.shadowRoot.querySelector('[data-cylinder]') as HTMLElement;

                this.setupCylinder(value);

                this.removeEvent();
                if (!this.disabled) {
                    this.addEvent();
                }
            }).then(() => this.isRendering = true);
    }

    private setupCylinder(value: number) {
        if (!this.cylinder) return;

        const onClickChild = async (element: Element) => {
            if (!this.cylinder) return;

            this.inertiaPan = undefined;

            const currentTarget = this.cylinder.querySelector('[data-cylinder-depth="0"]');

            if (currentTarget) {
                const children = Array.from(this.cylinder.children)
                const selectedIndex = children.findIndex(child => !child.hasAttribute('data-cylinder-padding') && child === element);
                const currentIndex = children.findIndex(child => child === currentTarget);

                if (selectedIndex > -1 && currentIndex > -1) {
                    await this.next(selectedIndex - currentIndex);
                }
            }
        }

        if (this.inertiaPan) {
            this.animationEndCallback = () => this.updateCylinderChildren(0);
        }

        this.$isAnimating = false;

        if (this.infinite) {
            const children = [];

            this.loopSize = 2 ** (3 - Math.min(Number(this.$length).toString(2).length, 3));

            for (let i = 0; i < this.loopSize * 2; i++) {
                const cloned = this.cylinder.cloneNode(true) as HTMLElement;
                children.push(...Array.from(cloned.children));
            }

            children.forEach(child => this.cylinder?.append(child));
            this.adjustInfiniteCylinder(value);

            let i = 0;
            for (let element of Array.from(this.cylinder.children)) {
                if (element instanceof HTMLElement) {
                    element.setAttribute('data-cylinder-depth', String(i - this.$length * this.loopSize));
                    i++;

                    if (!this.$disabled) {
                        element.onclick = element.ontouchend = () => onClickChild(element);
                    }
                }
            }
            this.cylinder.style.transform = `translateY(calc(-${this.loopSize / (this.loopSize * 2 + 1) * 100}% + 4.425em))`;
        } else {
            for (let i = 0; i < 3; i++) {
                const li = document.createElement('li');
                li.setAttribute('data-cylinder-padding', 'true');
                this.cylinder.insertBefore(li, this.cylinder.firstChild);
            }

            for (let i = 0; i < 3; i++) {
                const li = document.createElement('li');
                li.setAttribute('data-cylinder-padding', 'true');
                this.cylinder.append(li);
            }

            let i = 0;
            for (let element of Array.from(this.cylinder.children)) {
                if (element instanceof HTMLElement) {
                    element.setAttribute('data-cylinder-depth', String(i - 3 - value));
                    i++;

                    if (!this.$disabled) {
                        element.onclick = element.ontouchend = () => onClickChild(element);
                    }
                }
            }
            this.cylinder.style.transform = `translateY(${-0.75 - this.$value * 1.7248678414096916}em)`;
        }
    }

    stopInertia() {
        return new Promise<void>(resolve => {
            if (this.inertiaPan) {
                this.$inertiaPanCallback = () => new Promise(() => {
                    resolve();
                });
                this.inertiaPan = undefined;
            } else {
                resolve();
            }
        });
    }

    private didLoad() {
        return Promise.all([
            new Promise<void>(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    const onDocumentReadyStateComplete = () => {
                        window.off('load', onDocumentReadyStateComplete);
                        resolve();
                    }
                    window.on('load', onDocumentReadyStateComplete);
                }
            }),
            customElements.whenDefined(HTMLCylinderPicker.TAG)
        ])
    }

    private updateCylinderChildren(nth: number = 0) {
        if (!this.cylinder) return;

        Array.from(this.cylinder.children).forEach((element, i) => {
            element.setAttribute('data-cylinder-depth', String(this.$infinite ? i - (this.$length * this.loopSize + nth) : i - (3 + this.$value)));
        });
    }

    private updateCylinderPosition(nth: number = 0) {
        if (!this.cylinder) return;

        if (this.$infinite) {
            this.cylinder.style.transform = `translateY(calc(-${this.loopSize / (this.loopSize * 2 + 1) * 100}% + ${4.425 -nth * 1.7248678414096916}em))`;
        } else {
            this.cylinder.style.transform = `translateY(${-0.75 - this.$value * 1.7248678414096916}em)`;
        }
    }

    private up(nth: number) {
        if (!this.cylinder) return;

        for (let i = 0; i < Math.abs(nth); i++) {
            const last = this.cylinder.lastElementChild;
            if (last) this.cylinder.insertBefore(last, this.cylinder.firstElementChild);
        }
    }

    private down(nth: number) {
        if (!this.cylinder) return;

        for (let i = 0; i < Math.abs(nth); i++) {
            const first = this.cylinder.firstElementChild;
            if (first) this.cylinder.append(first);
        }
    }

    private updateAnimationSpeed(speed: number) {
        if (!this.cylinder) return;

        for (const element of [this.cylinder, ...Array.from(this.cylinder.children)]) {
            if (element instanceof HTMLElement) {
                element.style.transition = `all ${speed}ms linear`
            }
        }
    }

    private calculateDelta(delta: number): number {
        const next = (this.$length + (this.value + delta % this.$length)) % this.$length;
        const reverse = this.$value > next ? this.$value - next : this.$value + this.$length - next;
        const right = this.$length - reverse;
        return reverse < right ? -reverse : right;
    }

    private next(delta: number, speed: number = 150, force?: boolean) {
        return new Promise<this>(resolve => {
            if (!force && (!this.cylinder || this.$length === 0 || this.$isAnimating)) {
                resolve(this);
                return;
            }

            this.$isAnimating = true;

            const sign = Math.sign(delta);
            delta = Math.round(delta);

            if (!this.$infinite) {
                delta = Math.min(this.$length - this.$value - 1, Math.max(-this.$value, delta));
            } else {
                delta = this.calculateDelta(delta);
            }

            const modded = this.$length === 1 ? sign : delta % this.$length;
            this.$value = (this.$value + modded + this.$length) % this.$length;
            const speedByDelta = Math.abs(delta) * speed;

            this.updateAnimationSpeed(speedByDelta);
            this.updateCylinderChildren(modded);
            this.updateCylinderPosition(modded);

            setTimeout(() => {
                if (this.infinite) this.adjustInfiniteCylinder(modded);
                if (modded !== 0) {
                    this.dispatchEvent(new CylinderPickerEvent(this.querySelectorAll('li'), this.value));
                }
                if (this.animationEndCallback) {
                    this.animationEndCallback();
                    this.animationEndCallback = undefined;
                }
                setTimeout(() => {
                    this.$isAnimating = false;
                    this.updateCylinderChildren(0);
                    resolve(this);
                })
            }, speedByDelta);
        });
    }

    private adjustInfiniteCylinder(nth: number) {
        if (!this.cylinder) return;

        if (nth > 0) {
            this.down(nth);
        } else if (nth < 0) {
            this.up(nth);
        }

        this.updateAnimationSpeed(0);

        if (this.$infinite) {
            this.cylinder.style.transform = `translateY(calc(-${this.loopSize / (this.loopSize * 2 + 1) * 100}% + 4.425em))`;
        } else {
            this.cylinder.style.transform = `translateY(${-0.75 + -this.$value * 1.7248678414096916}em)`;
        }
    }

    private addEvent() {
        this.removeEvent();
        let lastPanDy = 0;
        let sumOfPanDy = 0;

        this.onMouseAndTouchPanMove = async (event: Event) => {
            if (event instanceof ExtendedMouseEvent || event instanceof ExtendedTouchEvent) {
                const last = event.paths.last;

                if (last) {
                    lastPanDy = last.dy;
                    sumOfPanDy += lastPanDy;
                    if (Math.abs(sumOfPanDy) >= 10) {
                        sumOfPanDy = 0;
                        await nextByPanDy(lastPanDy, 100);
                    }
                }
            }
        }

        this.onMouseAndTouchPanEnd = () => {
            this.inertiaPan = () => inertiaPan();
        };

        this.onWheel = async (event: Event) => {
            event.preventDefault();

            if (event instanceof WheelEvent) {
                this.inertiaPan = undefined;
                await nextByWheelDy(event.deltaY);
            }
        }

        this.on(['mousepanmove', 'touchpanmove'], this.onMouseAndTouchPanMove);
        this.on(['mousepanend', 'mousepanleave', 'touchpancancel', 'touchend'], this.onMouseAndTouchPanEnd);
        this.on(['wheel'], this.onWheel, {passive: false});

        const nextByPanDy = async (dy: number, speed?: number) => {
            if (!speed) {
                speed = 125 / Math.abs(dy);
            }

            await this.next(-Math.sign(dy), speed);
            if (this.inertiaPan) {
                await this.inertiaPan();
            }
        }

        const nextByWheelDy = async (dy: number) => {
            await this.next(Math.sign(dy), Math.min(100, 10000 / Math.abs(dy)));
        }

        const inertiaPan = async () => {
            if (Math.abs(lastPanDy) === Infinity) {
                lastPanDy = 10 * Math.sign(lastPanDy);
            }

            if (Math.abs(lastPanDy) > 0.5) {
                lastPanDy = lastPanDy * 0.875;
                await nextByPanDy(lastPanDy);
            } else {
                lastPanDy = 0;
                this.inertiaPan = undefined;

                if (this.$inertiaPanCallback) {
                    await this.$inertiaPanCallback();
                    this.$inertiaPanCallback = undefined;
                }
            }
        }
    }

    private removeEvent() {
        if (this.onMouseAndTouchPanMove) this.off(['mousepanmove', 'touchpanmove'], this.onMouseAndTouchPanMove);
        if (this.onMouseAndTouchPanEnd) this.off(['mousepanend', 'mousepanleave', 'touchpancancel', 'touchend'], this.onMouseAndTouchPanEnd);
        if (this.onWheel) this.off(['wheel'], this.onWheel, {passive: false});
    }
}

HTMLCylinderPicker.defineElement();

// declare global {
//     namespace JSX {
//         interface IntrinsicElements {
//             'cylinder-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
//         }
//     }
// }

export {};


(() => {
    GlobalThis.HTMLCylinderPicker = HTMLCylinderPicker;
})();

declare global {
    interface Window {
        HTMLCylinderPicker: HTMLCylinderPicker;
    }
}