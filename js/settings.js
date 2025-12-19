// Five Crowns - Settings Manager
// Handles user preferences including card design selection

console.log('⚙️ SETTINGS.JS LOADED');

// Settings configuration
const SETTINGS_CONFIG = {
    STORAGE_KEY: 'fiveCrownsSettings',
    DEFAULTS: {
        cardDesign: 'classic'
    },
    CARD_DESIGNS: [
        {
            id: 'classic',
            name: 'Classic',
            description: 'Traditional playing card design'
        }
        // Future designs will be added here:
        // { id: 'modern', name: 'Modern', description: 'Sleek minimalist design' },
        // { id: 'vintage', name: 'Vintage', description: 'Old-world elegance' },
        // { id: 'neon', name: 'Neon', description: 'Vibrant glowing cards' }
    ]
};

// Settings Manager Class
class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const stored = localStorage.getItem(SETTINGS_CONFIG.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all keys exist
                return { ...SETTINGS_CONFIG.DEFAULTS, ...parsed };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        return { ...SETTINGS_CONFIG.DEFAULTS };
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem(SETTINGS_CONFIG.STORAGE_KEY, JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    // Get current card design
    getCardDesign() {
        return this.settings.cardDesign || SETTINGS_CONFIG.DEFAULTS.cardDesign;
    }

    // Set card design
    setCardDesign(designId) {
        const validDesign = SETTINGS_CONFIG.CARD_DESIGNS.find(d => d.id === designId);
        if (validDesign) {
            this.settings.cardDesign = designId;
            this.saveSettings();
            this.applyCardDesign();
            return true;
        }
        console.warn('Invalid card design:', designId);
        return false;
    }

    // Apply card design to the DOM
    applyCardDesign() {
        const designId = this.getCardDesign();
        const body = document.body;

        // Remove all existing card design classes
        SETTINGS_CONFIG.CARD_DESIGNS.forEach(design => {
            body.classList.remove(`card-design-${design.id}`);
        });

        // Add current design class
        body.classList.add(`card-design-${designId}`);

        console.log(`✨ Applied card design: ${designId}`);
    }

    // Get all available card designs
    getAvailableDesigns() {
        return SETTINGS_CONFIG.CARD_DESIGNS;
    }

    // Initialize settings on page load
    initialize() {
        this.applyCardDesign();
        console.log('⚙️ Settings initialized:', this.settings);
    }

    // Reset settings to defaults
    resetToDefaults() {
        this.settings = { ...SETTINGS_CONFIG.DEFAULTS };
        this.saveSettings();
        this.applyCardDesign();
    }
}

// Create global settings manager instance
const settingsManager = new SettingsManager();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        settingsManager.initialize();
    });
} else {
    settingsManager.initialize();
}
