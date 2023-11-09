const openButton = document.getElementById('openPopup');
const closeButton = document.getElementById('closePopup');
const popupContainer = document.getElementById('popupContainer');
const ratingInputs = document.querySelectorAll('input[name="rating"]');
const commentInput = document.getElementById('comment');
const submitButton = document.getElementById('submit');

openButton.addEventListener('click', () => {
    popupContainer.style.display = 'block';
});

closeButton.addEventListener('click', () => {
    popupContainer.style.display = 'none';
});

// Close the popup if the user clicks outside of it
window.addEventListener('click', (event) => {
    if (event.target === popupContainer) {
        popupContainer.style.display = 'none';
    }
});

// Handle the submission of user ratings and comments
submitButton.addEventListener('click', () => {
    const userRating = document.querySelector('input[name="rating"]:checked').value;
    const userComment = commentInput.value;
    
    // You can handle the user rating and comment data as needed, such as sending it to a server.
    
    // For this example, we'll just log the values.
    console.log('User Rating:', userRating);
    console.log('User Comment:', userComment);
    
    // Close the popup after submission
    popupContainer.style.display = 'none';
});
