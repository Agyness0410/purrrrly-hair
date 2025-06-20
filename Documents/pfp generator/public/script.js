let currentInvitationCode = '';
let traitsData = {};
let selectedTraits = {};
let canvas, ctx;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    canvas = document.getElementById('avatarCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Validate invitation code
async function validateCode() {
    const code = document.getElementById('invitationCode').value.trim().toUpperCase();
    const errorDiv = document.getElementById('codeError');
    
    if (!code) {
        errorDiv.textContent = 'Please enter an invitation code';
        return;
    }
    
    try {
        const response = await fetch('/validate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });
        
        const result = await response.json();
        
        if (result.valid) {
            currentInvitationCode = code;
            showGenerator();
        } else {
            errorDiv.textContent = result.message || 'Invalid invitation code';
        }
    } catch (error) {
        errorDiv.textContent = 'Error validating code. Please try again.';
        console.error('Error:', error);
    }
}

// Show generator interface
async function showGenerator() {
    document.getElementById('codeEntry').classList.add('hidden');
    document.getElementById('generator').classList.remove('hidden');
    
    // Load traits data
    await loadTraits();
    renderTraitOptions();
    updatePreview();
}

// Load traits from server
async function loadTraits() {
    try {
        const response = await fetch('/api/traits');
        traitsData = await response.json();
        
        // Initialize selected traits with defaults
        Object.keys(traitsData).forEach(category => {
            selectedTraits[category] = 'skip';
        });
        
    } catch (error) {
        console.error('Error loading traits:', error);
    }
}

// Render trait selection options
function renderTraitOptions() {
    const container = document.getElementById('traitsContainer');
    container.innerHTML = '';
    
    // Define display order and names
    const categoryOrder = [
        '00background',
        '01body', 
        '02face',
        '03hair',
        '03body hoodie',
        '04mouth',
        '05eye',
        '06accessory',
        '07facemask'
    ];
    
    const categoryNames = {
        '00background': 'Background',
        '01body': 'Body/Clothing',
        '02face': 'Face Base',
        '03hair': 'Hair',
        '03body hoodie': 'Hoodie/Outerwear',
        '04mouth': 'Mouth',
        '05eye': 'Eyes',
        '06accessory': 'Accessories',
        '07facemask': 'Face Mask'
    };
    
    categoryOrder.forEach(category => {
        if (!traitsData[category]) return;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'trait-category';
        
        const title = document.createElement('h3');
        title.textContent = categoryNames[category] || category;
        categoryDiv.appendChild(title);
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'trait-options';
        
        // Add skip option
        const skipOption = createSkipOption(category);
        optionsDiv.appendChild(skipOption);
        
        // Add trait options from all rarities
        Object.keys(traitsData[category]).forEach(rarity => {
            traitsData[category][rarity].forEach(trait => {
                const option = createTraitOption(category, rarity, trait);
                optionsDiv.appendChild(option);
            });
        });
        
        categoryDiv.appendChild(optionsDiv);
        container.appendChild(categoryDiv);
    });
}

// Create skip option
function createSkipOption(category) {
    const option = document.createElement('div');
    option.className = 'trait-option skip';
    option.dataset.category = category;
    option.dataset.value = 'skip';
    
    const skipDiv = document.createElement('div');
    skipDiv.className = 'skip-option';
    skipDiv.textContent = 'Skip';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'trait-name';
    nameDiv.textContent = 'No Selection';
    
    option.appendChild(skipDiv);
    option.appendChild(nameDiv);
    
    option.addEventListener('click', () => selectTrait(category, 'skip', option));
    
    // Set as selected by default
    if (selectedTraits[category] === 'skip') {
        option.classList.add('selected');
    }
    
    return option;
}

// Create trait option
function createTraitOption(category, rarity, trait) {
    const option = document.createElement('div');
    option.className = 'trait-option';
    option.dataset.category = category;
    option.dataset.value = trait.path;
    
    const img = document.createElement('img');
    img.className = 'trait-preview';
    img.src = `/traits/${trait.path}`;
    img.alt = trait.name;
    img.onerror = function() {
        this.style.display = 'none';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'skip-option';
        errorDiv.textContent = 'Image not found';
        errorDiv.style.color = '#999';
        option.insertBefore(errorDiv, option.firstChild);
    };
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'trait-name';
    nameDiv.textContent = trait.name;
    
    option.appendChild(img);
    option.appendChild(nameDiv);
    
    option.addEventListener('click', () => selectTrait(category, trait.path, option));
    
    return option;
}

// Select a trait
function selectTrait(category, value, optionElement) {
    // Remove previous selection in this category
    const categoryOptions = document.querySelectorAll(`[data-category="${category}"]`);
    categoryOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Add selection to clicked option
    optionElement.classList.add('selected');
    
    // Update selected traits
    selectedTraits[category] = value;
    
    // Update preview
    updatePreview();
    
    // Check if combination is valid
    checkCombination();
}

// Update avatar preview
async function updatePreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const layerOrder = [
        '00background',
        '01body',
        '02face', 
        '03hair',
        '03body hoodie',
        '04mouth',
        '05eye',
        '06accessory',
        '07facemask'
    ];
    
    for (const category of layerOrder) {
        if (selectedTraits[category] && selectedTraits[category] !== 'skip') {
            await drawLayer(selectedTraits[category]);
        }
    }
}

// Draw a layer on canvas
function drawLayer(imagePath) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve();
        };
        img.onerror = function() {
            console.error('Failed to load image:', imagePath);
            resolve();
        };
        img.src = `/traits/${imagePath}`;
    });
}

// Check if combination already exists
async function checkCombination() {
    // Filter out 'skip' values for combination check
    const combination = {};
    Object.entries(selectedTraits).forEach(([key, value]) => {
        if (value !== 'skip') {
            combination[key] = value;
        }
    });
    
    // Only check if we have at least one trait selected
    const hasTraits = Object.keys(combination).length > 0;
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('generateStatus');
    
    if (!hasTraits) {
        generateBtn.disabled = true;
        statusDiv.innerHTML = '<div class="status warning">Please select at least one trait</div>';
        return;
    }
    
    try {
        const response = await fetch('/api/check-combination', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ combination })
        });
        
        const result = await response.json();
        
        if (result.exists) {
            generateBtn.disabled = true;
            statusDiv.innerHTML = '<div class="status error">This combination already exists</div>';
        } else {
            generateBtn.disabled = false;
            statusDiv.innerHTML = '<div class="status success">Unique combination - ready to generate!</div>';
        }
    } catch (error) {
        console.error('Error checking combination:', error);
        generateBtn.disabled = false;
        statusDiv.innerHTML = '<div class="status warning">Unable to verify uniqueness</div>';
    }
}

// Generate and download avatar
async function generateAvatar() {
    const generateBtn = document.getElementById('generateBtn');
    const statusDiv = document.getElementById('generateStatus');
    
    // Show loading
    document.getElementById('generator').classList.add('hidden');
    document.getElementById('loading').classList.remove('hidden');
    
    try {
        // Filter out 'skip' values
        const combination = {};
        Object.entries(selectedTraits).forEach(([key, value]) => {
            if (value !== 'skip') {
                combination[key] = value;
            }
        });
        
        const response = await fetch('/api/generate-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                combination,
                invitationCode: currentInvitationCode
            })
        });
        
        if (response.ok) {
            // Download the image
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `avatar_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Show success message and redirect
            alert('Avatar generated and downloaded successfully!');
            window.location.reload();
            
        } else {
            const error = await response.json();
            throw new Error(error.error);
        }
        
    } catch (error) {
        console.error('Error generating avatar:', error);
        alert('Error generating avatar: ' + error.message);
        
        // Return to generator
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('generator').classList.remove('hidden');
    }
}

// Allow Enter key for invitation code
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !document.getElementById('codeEntry').classList.contains('hidden')) {
        validateCode();
    }
});