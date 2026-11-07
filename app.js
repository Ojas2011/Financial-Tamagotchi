const startBudget = 500;
let budget = 500;

const petImage = document.getElementById('pet-img');
const healthBar = document.getElementById('health-bar');
const budgetText = document.getElementById('budget-text');
const messageBox = document.getElementById('message-box');
const expenseList = document.getElementById('expense-list');
const itemNameInput = document.getElementById('item-name');
const itemCostInput = document.getElementById('item-cost');
const buyBtn = document.getElementById('buy-btn');
const resetBtn = document.getElementById('reset-btn');

const API_URL = 'http://127.0.0.1:8888';

function getPetState(currentBudget) {
    const percent = (currentBudget / startBudget) * 100;
    if (percent > 50) return 'happy';
    if (percent > 20) return 'okay';
    if (percent > 0) return 'sick';
    return 'dead';
}

function getRandomMessage(state) {
    const messages = petMessages[state];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

function updateUI(budget, expenses) {
    const state = getPetState(budget);
    const healthPercent = (budget / startBudget) * 100;
    
    budgetText.innerText = `$${budget.toFixed(2)} / $${startBudget}`;
    healthBar.style.width = `${healthPercent}%`;
    
    if (state === 'happy') {
        healthBar.style.backgroundColor = '#4CAF50';
        petImage.src = 'assets/Happy.png'; 
    } else if (state === 'okay') {
        healthBar.style.backgroundColor = '#FFEB3B';
        petImage.src = 'assets/Okay.png'; 
    } else if (state === 'sick') {
        healthBar.style.backgroundColor = '#FF9800';
        petImage.src = 'assets/Sad.png'; 
    } else if (state === 'dead') {
        healthBar.style.backgroundColor = '#F44336';
        petImage.src = 'assets/Dead.png'; 
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
    }

    messageBox.innerText = getRandomMessage(state);

    expenseList.innerHTML = '';
    expenses.forEach(exp => {
        const li = document.createElement('li');
        li.innerText = `- $${exp.cost.toFixed(2)} on ${exp.name}`;
        expenseList.appendChild(li);
    });
}

async function fetchState() {
    try {
        const response = await fetch(`${API_URL}/state`);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        updateUI(data.budget, data.expenses);
    } catch (error) {
        console.error("Make sure your Python server is running!", error);
        messageBox.innerText = 'Could not connect to the server. Make sure it is running and try again.';
    }
}

buyBtn.addEventListener('click', async () => {
    const cost = parseFloat(itemCostInput.value);
    const name = itemNameInput.value.trim();
    
    if (isNaN(cost) || cost <= 0 || name === '') {
        alert('Please enter a valid item name and cost above $0.');
        return;
    }

    // Send the purchase to the Python backend
    try {
        const response = await fetch(`${API_URL}/expense`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, cost: cost })
        });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        updateUI(data.budget, data.expenses);
        itemNameInput.value = '';
        itemCostInput.value = '';
    } catch (error) {
        console.error('Could not save the expense.', error);
        messageBox.innerText = 'Could not save the expense. Check the server connection and try again.';
    }
});

resetBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        buyBtn.disabled = false;
        buyBtn.style.opacity = '1';
        updateUI(data.budget, data.expenses);
    } catch (error) {
        console.error('Could not reset the budget.', error);
        messageBox.innerText = 'Could not reset the budget. Check the server connection and try again.';
    }
});

fetchState();