const startBudget = 500;
let budget = 500;

const petImage = document.getElementById('pet-image');
const healthBar = document.getElementById('health-bar');
const budgetText = document.getElementById('budget-text');
const messageBox = document.getElementById('message-box');
const itemNameInput = document.getElementById('item-name');
const itemCostInput = document.getElementById('item-cost');
const buyBtn = document.getElementById('buy-btn');
const resetBtn = document.getElementById('reset-btn');

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

function updateUI() {
    const state = getPetState(budget);
    const healthPercent = (budget / startBudget) * 100;
    
    budgetText.innerText = `$${budget.toFixed(2)} / $${startBudget}`;
    healthBar.style.width = `${healthPercent}%`;
    
    if (state === 'happy') {
        healthBar.style.backgroundColor = '#4CAF50';
        petImage.innerText = '😎'; 
    } else if (state === 'okay') {
        healthBar.style.backgroundColor = '#FFEB3B';
        petImage.innerText = '🙂'; 
    } else if (state === 'sick') {
        healthBar.style.backgroundColor = '#FF9800';
        petImage.innerText = '🤢'; 
    } else if (state === 'dead') {
        healthBar.style.backgroundColor = '#F44336';
        petImage.innerText = '💀'; 
        buyBtn.disabled = true;
        buyBtn.style.opacity = '0.5';
    }

    messageBox.innerText = getRandomMessage(state);
}

buyBtn.addEventListener('click', () => {
    const cost = parseFloat(itemCostInput.value);
    
    if (isNaN(cost) || cost <= 0 || itemNameInput.value.trim() === '') {
        alert('Please enter a valid item name and cost above $0.');
        return;
    }

    budget -= cost;
    if (budget < 0) budget = 0; 

    updateUI();

    itemNameInput.value = '';
    itemCostInput.value = '';
});

resetBtn.addEventListener('click', () => {
    budget = startBudget;
    buyBtn.disabled = false;
    buyBtn.style.opacity = '1';
    updateUI();
});

updateUI();