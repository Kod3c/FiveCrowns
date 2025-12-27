/**
 * Wandering Wilds - Deck and Discard Pile Manager
 * Handles drawing cards from deck/discard and discarding cards via drag-and-drop
 */

class DeckDiscardManager {
    constructor(deckArea, discardArea, handContainer, options = {}) {
        this.deckArea = deckArea;
        this.discardArea = discardArea;
        this.handContainer = handContainer;

        this.options = {
            onDrawFromDeck: options.onDrawFromDeck || (() => {}),
            onDrawFromDiscard: options.onDrawFromDiscard || (() => {}),
            onDiscardDrop: options.onDiscardDrop || (() => {}),
            canDraw: options.canDraw || (() => true),
            canDiscard: options.canDiscard || (() => true),
            ...options
        };

        // State
        this.isDrawingEnabled = false;
        this.isDiscardEnabled = false;
        this.currentDraggedCard = null;
        this.dropZoneActive = false;

        this.init();
    }

    init() {
        console.log('DeckDiscardManager: Initializing');
        this.setupEventListeners();
        this.updateState();
    }

    setupEventListeners() {
        // Click events for drawing cards
        if (this.deckArea) {
            this.deckArea.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDeckClick();
            });

            this.deckArea.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDeckClick();
            });

            // Drag events for drawing from deck
            this.setupDeckDragListeners();
        }

        if (this.discardArea) {
            this.discardArea.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDiscardClick();
            });

            this.discardArea.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleDiscardClick();
            });

            // Drag events for drawing from discard
            this.setupDiscardDragListeners();
        }

        // Listen for card drag events from CardHandManager
        document.addEventListener('cardDragStart', (e) => {
            this.handleCardDragStart(e.detail.card);
        });

        document.addEventListener('cardDragMove', (e) => {
            this.handleCardDragMove(e.detail.x, e.detail.y);
        });

        document.addEventListener('cardDragEnd', (e) => {
            this.handleCardDragEnd(e);
        });

        document.addEventListener('cardDragCleanup', () => {
            this.handleCardDragCleanup();
        });

        console.log('DeckDiscardManager: Event listeners attached');
    }

    updateState() {
        if (this.deckArea) {
            if (this.isDrawingEnabled) {
                this.deckArea.classList.add('clickable');
                this.deckArea.style.cursor = 'pointer';
            } else {
                this.deckArea.classList.remove('clickable');
                this.deckArea.style.cursor = 'default';
            }
        }

        if (this.discardArea) {
            if (this.isDrawingEnabled) {
                this.discardArea.classList.add('clickable');
                this.discardArea.style.cursor = 'pointer';
            } else {
                this.discardArea.classList.remove('clickable');
                this.discardArea.style.cursor = 'default';
            }
        }
    }

    enableDrawing() {
        console.log('DeckDiscardManager: Enabling drawing');
        this.isDrawingEnabled = true;
        this.updateState();
    }

    disableDrawing() {
        console.log('DeckDiscardManager: Disabling drawing');
        this.isDrawingEnabled = false;
        this.updateState();
    }

    enableDiscard() {
        console.log('DeckDiscardManager: Enabling discard');
        this.isDiscardEnabled = true;
    }

    disableDiscard() {
        console.log('DeckDiscardManager: Disabling discard');
        this.isDiscardEnabled = false;
    }

    setupDeckDragListeners() {
        let pointerStart = null;
        let isDragging = false;
        let dragGhost = null;
        const touchThreshold = 10; // pixels before drag starts (increased for better mobile behavior)

        this.deckArea.addEventListener('pointerdown', (e) => {
            if (!this.isDrawingEnabled || !this.options.canDraw()) return;

            // Don't prevent default yet - let the browser handle initial touch
            pointerStart = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
                pointerId: e.pointerId
            };
        });

        this.deckArea.addEventListener('pointermove', (e) => {
            if (!pointerStart) return;

            const dx = e.clientX - pointerStart.x;
            const dy = e.clientY - pointerStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Start drag if moved beyond threshold
            if (!isDragging && distance > touchThreshold) {
                e.preventDefault(); // Now prevent default to avoid scrolling during drag
                isDragging = true;
                dragGhost = this.createDragGhost(this.deckArea, e);
                // Capture pointer only after drag starts
                this.deckArea.setPointerCapture(pointerStart.pointerId);
            }

            if (isDragging) {
                e.preventDefault();
                if (dragGhost) {
                    dragGhost.style.left = (e.clientX - 35) + 'px';
                    dragGhost.style.top = (e.clientY - 50) + 'px';
                }
            }
        });

        this.deckArea.addEventListener('pointerup', (e) => {
            if (isDragging && dragGhost) {
                // Check if dropped over hand area
                const isOverHand = this.isPointOverElement(e.clientX, e.clientY, this.handContainer);

                if (isOverHand) {
                    // Execute the draw
                    this.options.onDrawFromDeck();
                }

                // Cleanup
                if (dragGhost.parentNode) {
                    dragGhost.parentNode.removeChild(dragGhost);
                }
                dragGhost = null;

                // Release pointer capture if we had it
                if (this.deckArea.hasPointerCapture(e.pointerId)) {
                    this.deckArea.releasePointerCapture(e.pointerId);
                }
            }

            pointerStart = null;
            isDragging = false;
        });

        this.deckArea.addEventListener('pointercancel', () => {
            if (dragGhost && dragGhost.parentNode) {
                dragGhost.parentNode.removeChild(dragGhost);
            }
            dragGhost = null;
            pointerStart = null;
            isDragging = false;
        });
    }

    setupDiscardDragListeners() {
        let pointerStart = null;
        let isDragging = false;
        let dragGhost = null;
        const touchThreshold = 10; // pixels before drag starts (increased for better mobile behavior)

        this.discardArea.addEventListener('pointerdown', (e) => {
            if (!this.isDrawingEnabled || !this.options.canDraw()) return;

            // Don't prevent default yet - let the browser handle initial touch
            pointerStart = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
                pointerId: e.pointerId
            };
        });

        this.discardArea.addEventListener('pointermove', (e) => {
            if (!pointerStart) return;

            const dx = e.clientX - pointerStart.x;
            const dy = e.clientY - pointerStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Start drag if moved beyond threshold
            if (!isDragging && distance > touchThreshold) {
                e.preventDefault(); // Now prevent default to avoid scrolling during drag
                isDragging = true;
                dragGhost = this.createDragGhost(this.discardArea, e);
                // Capture pointer only after drag starts
                this.discardArea.setPointerCapture(pointerStart.pointerId);
            }

            if (isDragging) {
                e.preventDefault();
                if (dragGhost) {
                    dragGhost.style.left = (e.clientX - 35) + 'px';
                    dragGhost.style.top = (e.clientY - 50) + 'px';
                }
            }
        });

        this.discardArea.addEventListener('pointerup', (e) => {
            if (isDragging && dragGhost) {
                // Check if dropped over hand area
                const isOverHand = this.isPointOverElement(e.clientX, e.clientY, this.handContainer);

                if (isOverHand) {
                    // Execute the draw
                    this.options.onDrawFromDiscard();
                }

                // Cleanup
                if (dragGhost.parentNode) {
                    dragGhost.parentNode.removeChild(dragGhost);
                }
                dragGhost = null;

                // Release pointer capture if we had it
                if (this.discardArea.hasPointerCapture(e.pointerId)) {
                    this.discardArea.releasePointerCapture(e.pointerId);
                }
            }

            pointerStart = null;
            isDragging = false;
        });

        this.discardArea.addEventListener('pointercancel', (e) => {
            if (dragGhost && dragGhost.parentNode) {
                dragGhost.parentNode.removeChild(dragGhost);
            }
            dragGhost = null;
            pointerStart = null;
            isDragging = false;
        });
    }

    createDragGhost(sourceElement, event) {
        // Find the card element to clone
        let cardElement = sourceElement.querySelector('.card');

        // If no card found (for deck), create a simple card-back representation
        if (!cardElement) {
            const ghost = document.createElement('div');
            ghost.className = 'card drag-ghost';
            ghost.style.position = 'fixed';
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = '10000';
            ghost.style.width = '70px';
            ghost.style.height = '100px';
            ghost.style.left = (event.clientX - 35) + 'px';
            ghost.style.top = (event.clientY - 50) + 'px';
            ghost.style.transform = 'rotate(5deg) scale(1.1)';
            ghost.style.transition = 'none';
            ghost.style.opacity = '0.8';
            ghost.innerHTML = '<div class="card-content" style="display: flex; align-items: center; justify-content: center; font-size: 24px;">🂠</div>';
            document.body.appendChild(ghost);
            return ghost;
        }

        // Clone the actual card
        const ghost = cardElement.cloneNode(true);
        ghost.className = 'card drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.width = '70px';
        ghost.style.height = '100px';
        ghost.style.left = (event.clientX - 35) + 'px';
        ghost.style.top = (event.clientY - 50) + 'px';
        ghost.style.transform = 'rotate(5deg) scale(1.1)';
        ghost.style.transition = 'none';
        ghost.style.opacity = '0.8';
        document.body.appendChild(ghost);
        return ghost;
    }

    handleDeckClick() {
        console.log('DeckDiscardManager: Deck clicked');
        console.log('  isDrawingEnabled:', this.isDrawingEnabled);
        console.log('  canDraw():', this.options.canDraw());

        if (!this.isDrawingEnabled) {
            console.log('  Drawing is disabled');
            return;
        }

        if (!this.options.canDraw()) {
            console.log('  canDraw() returned false');
            return;
        }

        console.log('  Calling onDrawFromDeck callback');
        this.options.onDrawFromDeck();
    }

    handleDiscardClick() {
        console.log('DeckDiscardManager: Discard pile clicked');
        console.log('  isDrawingEnabled:', this.isDrawingEnabled);
        console.log('  canDraw():', this.options.canDraw());

        if (!this.isDrawingEnabled) {
            console.log('  Drawing is disabled');
            return;
        }

        if (!this.options.canDraw()) {
            console.log('  canDraw() returned false');
            return;
        }

        console.log('  Calling onDrawFromDiscard callback');
        this.options.onDrawFromDiscard();
    }

    handleCardDragStart(card) {
        console.log('DeckDiscardManager: Card drag started:', card.id);
        this.currentDraggedCard = card;

        if (this.isDiscardEnabled && this.options.canDiscard()) {
            this.showDiscardDropZone();
        }
    }

    handleCardDragMove(x, y) {
        if (!this.currentDraggedCard) return;
        if (!this.isDiscardEnabled || !this.options.canDiscard()) return;

        const isOverDiscard = this.isPointOverElement(x, y, this.discardArea);

        if (isOverDiscard && !this.dropZoneActive) {
            this.highlightDiscardDropZone();
            this.dropZoneActive = true;
        } else if (!isOverDiscard && this.dropZoneActive) {
            this.unhighlightDiscardDropZone();
            this.dropZoneActive = false;
        }
    }

    handleCardDragEnd(event) {
        if (!this.currentDraggedCard) return;
        if (!this.isDiscardEnabled || !this.options.canDiscard()) return;

        const { x, y } = event.detail;
        const isOverDiscard = this.isPointOverElement(x, y, this.discardArea);

        if (isOverDiscard) {
            console.log('DeckDiscardManager: Card dropped on discard pile:', this.currentDraggedCard.id);
            event.preventDefault();
            event.detail.dropTarget = 'discardPile';
            this.options.onDiscardDrop(this.currentDraggedCard);
        }
    }

    handleCardDragCleanup() {
        this.hideDiscardDropZone();
        this.currentDraggedCard = null;
        this.dropZoneActive = false;
    }

    showDiscardDropZone() {
        if (this.discardArea) {
            this.discardArea.classList.add('drop-zone-visible');
        }
    }

    hideDiscardDropZone() {
        if (this.discardArea) {
            this.discardArea.classList.remove('drop-zone-visible', 'drop-zone-active');
        }
    }

    highlightDiscardDropZone() {
        if (this.discardArea) {
            this.discardArea.classList.add('drop-zone-active');
        }
    }

    unhighlightDiscardDropZone() {
        if (this.discardArea) {
            this.discardArea.classList.remove('drop-zone-active');
        }
    }

    isPointOverElement(x, y, element) {
        if (!element) return false;

        const rect = element.getBoundingClientRect();

        // Add generous padding to make drop zone larger and easier to hit
        // Especially useful for discard pile
        const padding = element === this.discardArea ? 40 : 20; // Extra padding for discard

        return (
            x >= rect.left - padding &&
            x <= rect.right + padding &&
            y >= rect.top - padding &&
            y <= rect.bottom + padding
        );
    }

    destroy() {
        this.currentDraggedCard = null;
        this.dropZoneActive = false;
        console.log('DeckDiscardManager: Destroyed');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeckDiscardManager;
}
