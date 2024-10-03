// Gestione delle frecce per cambiare l'elemento nel section card menu
const cards = document.querySelectorAll('.card');
let currentCard = 0;

function showCard(index) {
    cards.forEach((card, i) => {
        card.classList.toggle('visible', i === index);
    });
}

// Riferimento ai pulsanti con gli ID corretti
document.querySelector('#nextCard').addEventListener('click', () => {
    currentCard = (currentCard + 1) % cards.length;
    showCard(currentCard);
});

document.querySelector('#prevCard').addEventListener('click', () => {
    currentCard = (currentCard - 1 + cards.length) % cards.length;
    showCard(currentCard);
});

// Mostra la prima card all'inizio
showCard(currentCard);
