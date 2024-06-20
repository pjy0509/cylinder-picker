import {GlobalThis} from "./utils";

export class HTMLCylinderPicker extends HTMLElement {
    private static empty = ' ';
    private isInfinite = false;
    private length = 0;
    private observer: MutationObserver | null = null;
    private cylinder: HTMLElement | null = null;
    private isAnimating = false;
    private loopSize = 0;
    currentValue: number = 0;

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({mode: 'open'});

        this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
        this.observer.observe(this, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['cylinder-infinity']
        });

        this.setup();
        this.render();
    }

    disconnectedCallback() {
        this.observer?.disconnect();
    }

    static get observedAttributes() {
        return [];
    }

    handleMutations(mutations: MutationRecord[]) {
        mutations.forEach((record) => {
            if (record.type === "attributes" && record.attributeName === 'cylinder-infinity') {
                this.updateIsInfinite();
                this.render();
            } else if (record.type === "childList") {
                this.render();
            }
        });
    }

    updateIsInfinite() {
        const value = this.getAttribute('cylinder-infinity');
        this.isInfinite = value !== 'false' && !!value;
    }

    setup() {
        this.updateIsInfinite();
    }

    render() {
        if (!this.shadowRoot) return;

        const liElements = Array.from(this.querySelectorAll('li'));
        this.length = liElements.length;

        this.shadowRoot.innerHTML = `
      <style>
        :host [data-cylinder-container] {
          position: relative;
          height: calc(8rem + 64px);
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
        }
        :host [data-cylinder] li {
          top: 0;
          position: relative;
          padding: 4px 2px;
          font-size: 1rem;
          height: 1.1rem;
          color: rgba(224, 224, 224, 1);
        }
        :host [data-cylinder].transition {
          transition: transform 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s, top 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s;
        }
        :host [data-cylinder].transition li {
          transition: transform 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s, opacity 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s, margin-top 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s, margin-bottom 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s, top 0.3s cubic-bezier(0.2, 1, 0.2, 1) 0s;
        }
      </style>
      <div data-cylinder-container="true">
        <ul data-cylinder="true">
          ${liElements.map(e => e.outerHTML).join('')}
        </ul>
      </div>
    `;

        this.cylinder = this.shadowRoot.querySelector('[data-cylinder]');

        if (!this.cylinder) return;

        if (this.isInfinite) {
            this.setupInfiniteCylinder();
        } else {
            this.setupFiniteCylinder();
        }
        this.next(this.currentValue).then();
    }

    setupInfiniteCylinder() {
        if (!this.cylinder) return;

        const length = this.cylinder.children.length;
        const children = [];

        if (length === 1) {
            this.loopSize = 4;
        } else if (length === 2 || length === 3) {
            this.loopSize = 2;
        }

        this.cylinder.style.transform = `translateY(calc(-${this.loopSize / (this.loopSize * 2 + 1) * 100}% + 3.85rem + 24px))`;

        for (let i = 0; i < this.loopSize * 2; i++) {
            const cloned = this.cylinder.cloneNode(true) as HTMLElement;
            children.push(...Array.from(cloned.children));
        }

        children.forEach(child => this.cylinder?.append(child));
    }

    setupFiniteCylinder() {
        if (!this.cylinder) return;

        for (let i = 0; i < 3; i++) {
            const li = document.createElement('li');
            li.setAttribute('data-cylinder-padding', 'true');
            li.innerText = HTMLCylinderPicker.empty;
            this.cylinder.insertBefore(li, this.cylinder.firstChild);
        }

        for (let i = 0; i < 3; i++) {
            const li = document.createElement('li');
            li.setAttribute('data-cylinder-padding', 'true');
            li.innerText = HTMLCylinderPicker.empty;
            this.cylinder.append(li);
        }

        this.cylinder.style.transform = 'translateY(0.5rem)';
    }

    up() {
        if (!this.cylinder) return;

        const last = this.cylinder.lastElementChild;
        if (last) this.cylinder.insertBefore(last, this.cylinder.firstElementChild);
    }

    down() {
        if (!this.cylinder) return;

        const first = this.cylinder.firstElementChild;
        if (first) this.cylinder.append(first);
    }

    toggleAnimation(use: boolean) {
        if (!this.cylinder) return;

        this.cylinder.classList.toggle('transition', use);
    }

    next(delta: number, useAnimation: boolean = true) {
        const sign = Math.sign(delta);
        delta = Math.round(delta);

        return new Promise<this>((resolve, reject) => {
            if (this.isAnimating || !this.cylinder) {
                reject();
                return;
            }

            this.isAnimating = true;

            if (!this.isInfinite) {
                delta = Math.min(this.length - this.currentValue - 1, Math.max(-this.currentValue, delta));
            } else {
                delta = this.calculateDelta(delta);
            }

            const modded = this.length === 1 ? sign : delta % this.length;
            this.currentValue = (this.currentValue + modded + this.length) % this.length;

            this.toggleAnimation(useAnimation);
            this.updateCylinderChildren(modded);
            this.updateCylinderPosition(modded);

            setTimeout(() => {
                this.isAnimating = false;
                if (this.isInfinite) this.adjustInfiniteCylinder(modded);
                resolve(this);
            }, useAnimation ? 300 : 0);
        });
    }

    calculateDelta(delta: number): number {
        const next = (this.length + (this.currentValue + delta % this.length)) % this.length;
        const reverse = this.currentValue > next ? this.currentValue - next : this.currentValue + this.length - next;
        const right = this.length - reverse;
        return reverse < right ? -reverse : right;
    }

    updateCylinderChildren(modded: number) {
        if (!this.cylinder) return;

        Array.from(this.cylinder.children).forEach((element, i) => {
            const x = this.isInfinite ? i - (this.length * this.loopSize + modded) : i - (3 + this.currentValue);
            const deg = x * 20;
            const rad = deg * (Math.PI / 180);
            const cos = Math.cos(rad);
            const htmlElement = element as HTMLElement;

            htmlElement.classList.toggle('cylinder-selected', x === 0);
            htmlElement.style.opacity = `${cos / Math.sqrt(Math.abs(x) + 1)}`;
            htmlElement.style.transform = `rotateX(${deg}deg)`;
        });
    }

    updateCylinderPosition(modded: number) {
        if (!this.cylinder) return;

        this.cylinder.style.top = this.isInfinite
            ? `calc(${-modded * 1.1}rem - ${modded * 8}px)`
            : `calc(${-this.currentValue * 1.1}rem - ${this.currentValue * 8}px)`;
    }

    adjustInfiniteCylinder(modded: number) {
        if (!this.cylinder) return;

        if (modded > 0) {
            for (let i = 0; i < modded; i++) this.down();
        } else if (modded < 0) {
            for (let i = 0; i < -modded; i++) this.up();
        }

        this.toggleAnimation(false);
        this.cylinder.style.top = '0';
    }
}

customElements.define('cylinder-picker', HTMLCylinderPicker);

// if (typeof React !== 'undefined') {
//     declare global {
//         namespace JSX {
//             interface IntrinsicElements {
//                 'cylinder-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
//             }
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