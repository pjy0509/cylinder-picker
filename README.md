# Cylinder picker
![NPM](https://nodei.co/npm/cylinder-picker.png?downloads=true&downloadRank=true&stars=true)<br>
![NPM Downloads](https://img.shields.io/npm/d18m/cylinder-picker?style=flat&logo=npm&logoColor=%23CB3837&label=Download&color=%23CB3837&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Feventlistener-manager) 
![GitHub Repo stars](https://img.shields.io/github/stars/pjy0509/cylinder-picker?style=flat&logo=github&logoColor=181717&label=Stars&color=181717&link=https%3A%2F%2Fgithub.com%2Fpjy0509%2Feventlistener-manager)<br> 
![Static Badge](https://img.shields.io/badge/Typescript-8A2BE2?logo=typescript&color=000000)
## Sample page
### [Link](https://pjy0509.github.io/example/cylinder-picker/)
## Install
npm
```bash
npm i cylinder-picker
```
cdn
```html
<script src="https://unpkg.com/cylinder-picker@latest/dist/index.umd.js"></script>
```
## Report errors and suggestions
### [Gmail](mailto:qkrwnss0509@gmail.com?subject=Report_errors_and_suggestions)
## Change log
| Version | Log                                                                          |
|---------|------------------------------------------------------------------------------|
| 1.0.0   | Release                                                                      |
| 1.0.67  | Correction of UI errors on a cylinder-picker with a large amount of elements |
| 1.0.74  | Improve the experience of using Touch-pan gestures                           |
## Usage
Add the custom element to your HTML file:

default
```html
<cylinder-picker>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
</cylinder-picker>
```

with infinity scroll
```html
<cylinder-picker infinite>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
</cylinder-picker>
```

with disabled
```html
<cylinder-picker disabled>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
</cylinder-picker>
```

with curvature
```html
<cylinder-picker curvature="25">
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
</cylinder-picker>
```
## Properties
The `HTMLCylinderPicker` class comes with several properties that can be both retrieved and set, allowing for customization and dynamic interaction.
### List `set`
Sets the list of items to be displayed in the picker.
```javascript
const picker = document.querySelector('cyliner-picker');
picker.list = ["Item 1", "Item 2", "Item 3"]; // set
```
### Value `get` `set`
The index of the currently selected item.
```javascript
const picker = document.querySelector('cyliner-picker');
picker.value = 3; // set
console.log(picker.value); // get
```
* <i>This example sets the value of the cylinder-picker to the third index.</i>
### ElementValue `get`
The HTMLLIElement corresponding to the current value.
```javascript
const picker = document.querySelector('cyliner-picker');
console.log(picker.elementValue); // get
```
### Curvature `get` `set` 
Adjusts the curvature of the cylinder. <b>default: 20</b>
```javascript
const picker = document.querySelector('cyliner-picker');
picker.curvature = 25; // set
console.log(picker.curvature); // get
```
### Infinite `get` `set`
Enables infinite scrolling. <b>default: false</b>
```javascript
const picker = document.querySelector('cyliner-picker');
picker.infinite = true; // set
console.log(picker.infinite); // get
```
### Disabled `get` `set`
Disables user interaction with the picker. <b>default: false</b>
```javascript
const picker = document.querySelector('cyliner-picker');
picker.disabled = true; // set
console.log(picker.disabled); // get
```
### InertiaPanCallback `set`
Sets a callback function to be executed during inertia scrolling.
```javascript
const picker = document.querySelector('cyliner-picker');
picker.inertiaPanCallback = () => {
    console.log(picker.value);
}; // set
```
* <i>This example outputs the value of the cylinder-picker when the pan gesture inertia of the cylinder-picker ends.</i>
### Length `get`
Length of elements in the cylinder-picker.
```javascript
const picker = document.querySelector('cyliner-picker');
console.log(picker.length); // get
```
### IsAnimating `get`
The cylinder-picker is currently animated.
```javascript
const picker = document.querySelector('cyliner-picker');
console.log(picker.isAnimating); // get
```
## Methods
### stopInertia()
Stops any ongoing inertia scrolling.
```javascript
const picker = document.querySelector('cyliner-picker');
await picker.stopInertia();
```
## Events
The HTMLCylinderPicker dispatches a custom event change when the selected item changes. You can listen for this event as follows:
```javascript
const picker = document.querySelector('cyliner-picker');
picker.addEventListener('change', (event) => {
    console.log('New value:', event.detail.value);
});
```
## Interaction Capabilities
The HTMLCylinderPicker allows users to interact with it through various input methods:

### Mouse Wheel
Users can scroll through the picker items using the mouse wheel.

### Touch Pan Gesture / Mouse Pan Gesture
Touch pan or mouse pan gestures, such as swiping up and down on touch-enabled devices, can be used to navigate through the picker items.

### Touch / Click
Touching or clicking an item directly will select that item.

These interactions are designed to provide a seamless and intuitive experience across different devices and input methods.