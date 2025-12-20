/**
 * Five Crowns - Card Hand Manager
 * Modern touch-first card hand system with multi-stack support
 */

class CardHandManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            enableMultiStack: options.enableMultiStack !== false,
            maxStacks: options.maxStacks || 5,
            enableSorting: options.enableSorting !== false,
            highlightWilds: options.highlightWilds !== false, // Default to true
            animationDuration: options.animationDuration || 300,
            touchThreshold: options.touchThreshold || 3, // pixels before drag starts (reduced for easier dragging)
            longPressDelay: options.longPressDelay || 800, // milliseconds for long press (increased to avoid interfering with drag)
            ...options
        };

        // State
        this.stacks = [];
        this.selectedCards = new Set();
        this.dragState = null;
        this.currentWildRank = null;
        this.autoScrollInterval = null;

        // Callbacks
        this.onSelectionChange = options.onSelectionChange || (() => {});
        this.onStackChange = options.onStackChange || (() => {});
        this.onCardMove = options.onCardMove || (() => {});

        this.init();
    }

    init() {
        this.createDefaultStack();
        this.setupEventListeners();
        this.render();
    }

    createDefaultStack() {
        this.stacks.push({
            id: 'default',
            name: 'My Hand',
            cards: [],
            isDefault: true,
            locked: false
        });
    }

    /**
     * Get the display name for a stack
     */
    getStackDisplayName(stack) {
        // If this is the default stack and there are multiple stacks, show "Group 1"
        if (stack.isDefault && this.stacks.length > 1) {
            return 'Group 1';
        }
        // Otherwise use the stack's actual name
        return stack.name;
    }

    /**
     * Set the wild card rank for highlighting
     */
    setWildRank(rank) {
        this.currentWildRank = rank;
        this.render();
    }

    /**
     * Set cards for a specific stack
     */
    setCards(cards, stackId = 'default', skipRender = false) {
        console.log('setCards() called with', cards.length, 'cards for stack', stackId);
        const stack = this.stacks.find(s => s.id === stackId);
        if (stack) {
            stack.cards = cards.map((card, index) => ({
                ...card,
                stackId: stackId,
                index: index
            }));
            if (!skipRender) {
                this.render();
            }
        }
    }

    /**
     * Get all cards from all stacks
     */
    getAllCards() {
        return this.stacks.flatMap(s => s.cards);
    }

    /**
     * Get selected cards
     */
    getSelectedCards() {
        return Array.from(this.selectedCards).map(cardId => {
            for (const stack of this.stacks) {
                const card = stack.cards.find(c => c.id === cardId);
                if (card) return card;
            }
            return null;
        }).filter(c => c !== null);
    }

    /**
     * Get current hand state for saving (card organization)
     */
    getHandState() {
        return {
            stacks: this.stacks.map(stack => ({
                id: stack.id,
                name: stack.name,
                isDefault: stack.isDefault,
                locked: stack.locked,
                cardIds: stack.cards.map(c => c.id)
            }))
        };
    }

    /**
     * Restore hand state (card organization)
     * This should be called AFTER setCards has been called with all the cards
     */
    restoreHandState(savedState) {
        if (!savedState || !savedState.stacks) {
            console.log('No saved hand state to restore');
            return;
        }

        console.log('Restoring hand state:', savedState);
        console.log('Current stacks before restore:', this.stacks.length);

        // Get all current cards
        const allCards = this.getAllCards();
        console.log('All cards to redistribute:', allCards.length, allCards.map(c => c.id));
        const cardMap = new Map(allCards.map(c => [c.id, c]));

        // Clear existing stacks
        this.stacks = [];

        // Recreate stacks from saved state
        savedState.stacks.forEach(savedStack => {
            // Validate saved stack has required properties
            if (!savedStack.id || !savedStack.name) {
                console.warn('Invalid saved stack, skipping:', savedStack);
                return;
            }

            const cardIds = savedStack.cardIds || [];
            console.log('Restoring stack:', savedStack.name, 'with', cardIds.length, 'cards');

            const stack = {
                id: savedStack.id,
                name: savedStack.name,
                isDefault: savedStack.isDefault || false,
                locked: savedStack.locked || false,
                cards: []
            };

            // Add cards to stack in the saved order
            cardIds.forEach(cardId => {
                const card = cardMap.get(cardId);
                if (card) {
                    card.stackId = stack.id;
                    stack.cards.push(card);
                    cardMap.delete(cardId); // Remove from map to track which cards have been placed
                } else {
                    console.warn('Card not found in hand:', cardId);
                }
            });

            console.log('Stack', savedStack.name, 'now has', stack.cards.length, 'cards');
            this.stacks.push(stack);
        });

        // If there are any cards left that weren't in the saved state,
        // add them to the default stack
        const remainingCards = Array.from(cardMap.values());
        if (remainingCards.length > 0) {
            console.log('Found', remainingCards.length, 'cards not in saved state, adding to default stack');
            const defaultStack = this.stacks.find(s => s.isDefault);
            if (defaultStack) {
                remainingCards.forEach(card => {
                    card.stackId = defaultStack.id;
                    defaultStack.cards.push(card);
                });
            }
        }

        // Ensure we have at least a default stack
        if (this.stacks.length === 0) {
            console.log('No stacks after restore, creating default');
            this.createDefaultStack();
        }

        console.log('Restored', this.stacks.length, 'stacks');
        this.render();
    }

    /**
     * Create a new stack
     */
    createStack(name) {
        if (this.stacks.length >= this.options.maxStacks) {
            console.warn('Maximum stacks reached');
            return null;
        }

        const stack = {
            id: 'stack-' + Date.now(),
            name: name || `Stack ${this.stacks.length}`,
            cards: [],
            isDefault: false,
            locked: false
        };

        this.stacks.push(stack);
        this.render();
        this.onStackChange(this.stacks);
        return stack;
    }

    /**
     * Delete a stack (moves cards back to default)
     */
    deleteStack(stackId) {
        const stackIndex = this.stacks.findIndex(s => s.id === stackId);
        if (stackIndex === -1 || this.stacks[stackIndex].isDefault) return;

        const stack = this.stacks[stackIndex];
        const defaultStack = this.stacks.find(s => s.isDefault);

        // Move cards to default stack
        defaultStack.cards.push(...stack.cards);

        // Remove stack
        this.stacks.splice(stackIndex, 1);
        this.render();
        this.onStackChange(this.stacks);
    }

    /**
     * Remove empty non-default stacks
     */
    cleanupEmptyStacks() {
        const emptyStacks = this.stacks.filter(s => !s.isDefault && s.cards.length === 0);

        emptyStacks.forEach(stack => {
            const stackIndex = this.stacks.findIndex(s => s.id === stack.id);
            if (stackIndex !== -1) {
                this.stacks.splice(stackIndex, 1);
            }
        });

        if (emptyStacks.length > 0) {
            this.render();
            this.onStackChange(this.stacks);
        }
    }

    /**
     * Sort cards in a stack
     */
    sortStack(stackId, sortType = 'suit') {
        const stack = this.stacks.find(s => s.id === stackId);
        if (!stack) return;

        const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const suitOrder = ['spades', 'hearts', 'diamonds', 'clubs', 'stars'];

        switch (sortType) {
            case 'suit':
                stack.cards.sort((a, b) => {
                    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
                    if (suitDiff !== 0) return suitDiff;
                    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
                });
                break;
            case 'rank':
                stack.cards.sort((a, b) => {
                    const rankDiff = rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
                    if (rankDiff !== 0) return rankDiff;
                    return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
                });
                break;
            case 'wild':
                stack.cards.sort((a, b) => {
                    const aIsWild = a.rank === this.currentWildRank ? 1 : 0;
                    const bIsWild = b.rank === this.currentWildRank ? 1 : 0;
                    if (aIsWild !== bIsWild) return bIsWild - aIsWild;
                    return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
                });
                break;
        }

        this.render();
        // Trigger stack change callback so state gets saved
        this.onStackChange(this.stacks);
    }

    /**
     * Render the entire hand
     */
    render() {
        console.log('CardHandManager render() called');
        this.container.innerHTML = '';

        const stacksContainer = document.createElement('div');
        stacksContainer.className = 'stacks-container';

        this.stacks.forEach(stack => {
            const stackEl = this.createStackElement(stack);
            stacksContainer.appendChild(stackEl);
        });

        // Add persistent "New Group" button at bottom (only if multi-stack enabled)
        if (this.options.enableMultiStack && this.stacks.length < this.options.maxStacks) {
            const newStackBtn = this.createNewStackButton();
            stacksContainer.appendChild(newStackBtn);
        }

        this.container.appendChild(stacksContainer);
    }

    /**
     * Create a stack element
     */
    createStackElement(stack) {
        const stackEl = document.createElement('div');
        stackEl.className = 'card-stack-wrapper';
        stackEl.dataset.stackId = stack.id;

        // Stack header
        const header = document.createElement('div');
        header.className = 'stack-header';

        const title = document.createElement('div');
        title.className = 'stack-title';
        title.textContent = this.getStackDisplayName(stack);

        const count = document.createElement('div');
        count.className = 'stack-count';
        count.textContent = `${stack.cards.length} cards`;

        header.appendChild(title);
        header.appendChild(count);

        // Stack actions (if not default)
        if (!stack.isDefault) {
            const actions = document.createElement('div');
            actions.className = 'stack-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'stack-action-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteStack(stack.id);
            });

            actions.appendChild(deleteBtn);
            header.appendChild(actions);
        }

        // Sort button (if enabled)
        if (this.options.enableSorting) {
            const sortBtn = document.createElement('button');
            sortBtn.className = 'stack-sort-btn';
            sortBtn.innerHTML = '⇅';
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSortMenu(stack.id, sortBtn);
            });
            header.appendChild(sortBtn);
        }

        stackEl.appendChild(header);

        // Cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'stack-cards';
        cardsContainer.dataset.stackId = stack.id;

        stack.cards.forEach((card, index) => {
            const cardEl = this.createCardElement(card, stack.id, index);
            cardsContainer.appendChild(cardEl);
        });

        // Drop zone indicator
        const dropZone = document.createElement('div');
        dropZone.className = 'stack-drop-zone';
        dropZone.textContent = stack.cards.length === 0 ? 'Drop cards here' : '';
        cardsContainer.appendChild(dropZone);

        stackEl.appendChild(cardsContainer);

        return stackEl;
    }

    /**
     * Create a card element with modern touch support
     */
    createCardElement(card, stackId, index) {
        const cardEl = document.createElement('div');
        cardEl.className = 'hand-card';
        cardEl.dataset.cardId = card.id;
        cardEl.dataset.stackId = stackId;
        cardEl.dataset.index = index;

        // Check if selected
        if (this.selectedCards.has(card.id)) {
            cardEl.classList.add('selected');
        }

        // Check if wild (only add class if highlighting is enabled)
        if (this.options.highlightWilds && card.rank === this.currentWildRank) {
            cardEl.classList.add('wild');
        }

        // Special handling for Joker cards
        if (card.rank === 'Joker') {
            // For jokers, just show the joker emoji centered
            const content = document.createElement('div');
            content.className = 'card-content';

            const jokerSymbol = document.createElement('span');
            jokerSymbol.className = 'card-suit joker';
            jokerSymbol.textContent = '🃏';
            jokerSymbol.style.fontSize = '48px'; // Make it larger

            content.appendChild(jokerSymbol);
            cardEl.appendChild(content);
        } else {
            // Regular cards
            // Corner rank (top-left)
            const cornerRank = document.createElement('div');
            cornerRank.className = `card-corner ${card.suit}`;
            cornerRank.innerHTML = `
                <span class="corner-rank">${card.rank}</span>
                <span class="corner-suit">${this.getSuitSymbol(card.suit)}</span>
            `;
            cardEl.appendChild(cornerRank);

            // Center content
            const content = document.createElement('div');
            content.className = 'card-content';

            const rank = document.createElement('span');
            rank.className = `card-rank ${card.suit}`;
            rank.textContent = card.rank;

            const suit = document.createElement('span');
            suit.className = `card-suit ${card.suit}`;
            suit.textContent = this.getSuitSymbol(card.suit);

            content.appendChild(rank);
            content.appendChild(suit);
            cardEl.appendChild(content);
        }

        // Attach event listeners
        this.attachCardEventListeners(cardEl, card);

        return cardEl;
    }

    /**
     * Get suit symbol
     */
    getSuitSymbol(suit) {
        const symbols = {
            'spades': '♠',
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'stars': '⭐',
            'joker': '🃏'  // Joker symbol
        };
        return symbols[suit] || '?';
    }

    /**
     * Attach modern pointer event listeners to card
     */
    attachCardEventListeners(cardEl, card) {
        let pointerStart = null;
        let longPressTimer = null;
        let isDragging = false;

        // Pointer down - start tracking
        cardEl.addEventListener('pointerdown', (e) => {
            // Don't prevent default immediately - allow scrolling to work
            pointerStart = {
                x: e.clientX,
                y: e.clientY,
                time: Date.now(),
                element: cardEl,
                card: card,
                pointerId: e.pointerId
            };

            // Start long-press timer for context menu (only if not already dragging)
            longPressTimer = setTimeout(() => {
                if (!isDragging && pointerStart) {
                    this.showCardContextMenu(card, cardEl, e);
                    pointerStart = null;
                }
            }, this.options.longPressDelay);

            cardEl.setPointerCapture(e.pointerId);
        });

        // Pointer move - check if dragging
        cardEl.addEventListener('pointermove', (e) => {
            if (!pointerStart) return;

            const dx = e.clientX - pointerStart.x;
            const dy = e.clientY - pointerStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Start drag if moved beyond threshold
            if (!isDragging && distance > this.options.touchThreshold) {
                // Now prevent default to stop scrolling during drag
                e.preventDefault();
                clearTimeout(longPressTimer);
                isDragging = true;
                this.startDrag(card, cardEl, e);
            }

            if (isDragging) {
                e.preventDefault(); // Continue preventing default while dragging
                this.updateDrag(e);
            }
        });

        // Pointer up - complete action
        cardEl.addEventListener('pointerup', (e) => {
            clearTimeout(longPressTimer);

            if (isDragging) {
                this.endDrag(e);
            } else if (pointerStart) {
                // This is a tap/click
                this.toggleCardSelection(card, cardEl);
            }

            pointerStart = null;
            isDragging = false;
            cardEl.releasePointerCapture(e.pointerId);
        });

        // Pointer cancel
        cardEl.addEventListener('pointercancel', (e) => {
            clearTimeout(longPressTimer);
            if (isDragging) {
                this.cancelDrag();
            }
            pointerStart = null;
            isDragging = false;
        });
    }

    /**
     * Toggle card selection
     */
    toggleCardSelection(card, cardEl) {
        if (this.selectedCards.has(card.id)) {
            this.selectedCards.delete(card.id);
            cardEl.classList.remove('selected');
        } else {
            // Clear all previous selections
            this.clearSelection();
            // Select only this card
            this.selectedCards.add(card.id);
            cardEl.classList.add('selected');
        }

        this.onSelectionChange(this.getSelectedCards());
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedCards.clear();
        const allCards = this.container.querySelectorAll('.hand-card');
        allCards.forEach(card => card.classList.remove('selected'));
        this.onSelectionChange([]);
    }

    /**
     * Start drag operation
     */
    startDrag(card, cardEl, event) {
        console.log('Starting drag for card:', card.id);

        this.dragState = {
            card: card,
            element: cardEl,
            originalStack: cardEl.dataset.stackId,
            originalIndex: parseInt(cardEl.dataset.index),
            startX: event.clientX,
            startY: event.clientY,
            currentX: event.clientX,
            currentY: event.clientY,
            ghost: null,
            placeholder: null,
            currentDropInfo: null,
            lastDropInfoUpdate: 0 // Timestamp for throttling placeholder moves
        };

        // Create ghost that follows cursor
        const ghost = cardEl.cloneNode(true);
        ghost.className = 'hand-card drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000';
        ghost.style.width = '70px';
        ghost.style.height = '100px';
        ghost.style.left = (event.clientX - 35) + 'px';
        ghost.style.top = (event.clientY - 50) + 'px';
        ghost.style.transform = 'rotate(5deg) scale(1.1)';
        ghost.style.transition = 'none';
        document.body.appendChild(ghost);
        this.dragState.ghost = ghost;

        // Create placeholder in original position
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder hand-card'; // Use hand-card class to inherit proper sizing/spacing
        cardEl.parentNode.insertBefore(placeholder, cardEl);
        this.dragState.placeholder = placeholder;

        // Hide original card
        cardEl.style.display = 'none';

        // Add class to body to show new stack zone
        document.body.classList.add('card-dragging');

        // Emit drag start event for global drop zones (like discard pile)
        this.emitDragStart(card);
    }

    /**
     * Update drag position
     */
    updateDrag(event) {
        if (!this.dragState || !this.dragState.ghost) return;

        this.dragState.currentX = event.clientX;
        this.dragState.currentY = event.clientY;

        // Move ghost to follow cursor (always smooth)
        this.dragState.ghost.style.left = (event.clientX - 35) + 'px';
        this.dragState.ghost.style.top = (event.clientY - 50) + 'px';

        // Handle auto-scrolling when near edges
        this.handleAutoScroll(event.clientY);

        // Throttle placeholder updates to reduce jumpiness
        const now = Date.now();
        const timeSinceLastUpdate = now - this.dragState.lastDropInfoUpdate;

        if (timeSinceLastUpdate < 100) {
            // Skip update if less than 100ms since last change
            return;
        }

        // Check for drop target (stack or specific card position)
        const dropInfo = this.getDropPosition(event.clientX, event.clientY);

        // Move placeholder to show where card will land (only if significantly changed)
        if (dropInfo && this.hasDropInfoChanged(dropInfo, this.dragState.currentDropInfo)) {
            this.movePhantomPlaceholder(dropInfo);
            this.dragState.currentDropInfo = dropInfo;
            this.dragState.lastDropInfoUpdate = now;
        }

        // Emit drag move for global drop zones
        this.emitDragMove(event.clientX, event.clientY);
    }

    /**
     * Check if drop info has changed
     */
    hasDropInfoChanged(newInfo, oldInfo) {
        if (!oldInfo) return true;
        return newInfo.stackId !== oldInfo.stackId || newInfo.insertIndex !== oldInfo.insertIndex;
    }

    /**
     * End drag operation
     */
    endDrag(event) {
        if (!this.dragState) return;

        console.log('Ending drag');

        // Get final drop position
        const dropInfo = this.dragState.currentDropInfo || this.getDropPosition(event.clientX, event.clientY);

        // Check if dropping on a global drop zone (like discard pile)
        const globalDropTarget = this.emitDragEnd(event.clientX, event.clientY);

        if (globalDropTarget) {
            // Card dropped on external target (like discard pile)
            console.log('Dropped on global target:', globalDropTarget);
            // External handler will deal with this
        } else if (dropInfo && dropInfo.stackId === '__NEW_STACK__') {
            // Dropped on new stack zone - create new stack and add card
            console.log('Creating new stack with card');
            const newStack = this.createStackAuto();
            if (newStack) {
                this.moveCardToPosition(this.dragState.card, newStack.id, 0);
            }
        } else if (dropInfo && dropInfo.insertIndex !== undefined) {
            // Dropped back in hand - move to new position
            console.log('Moving card to position', dropInfo.insertIndex);
            this.moveCardToPosition(this.dragState.card, dropInfo.stackId, dropInfo.insertIndex);
        } else {
            // Invalid drop - return to original position
            console.log('Invalid drop - returning to original position');
        }

        // Clean up
        this.cleanupDrag();
    }

    /**
     * Cancel drag operation
     */
    cancelDrag() {
        this.cleanupDrag();
    }

    /**
     * Cleanup drag state
     */
    cleanupDrag() {
        if (!this.dragState) return;

        // Remove ghost
        if (this.dragState.ghost && this.dragState.ghost.parentNode) {
            this.dragState.ghost.parentNode.removeChild(this.dragState.ghost);
        }

        // Remove placeholder
        if (this.dragState.placeholder && this.dragState.placeholder.parentNode) {
            this.dragState.placeholder.parentNode.removeChild(this.dragState.placeholder);
        }

        // Show original card again
        if (this.dragState.element) {
            this.dragState.element.style.display = '';
        }

        // Remove dragging class from body
        document.body.classList.remove('card-dragging');

        // Stop auto-scrolling
        this.stopAutoScroll();

        // Emit drag end for cleanup
        this.emitDragCleanup();

        this.dragState = null;
    }

    /**
     * Move placeholder to show drop position
     */
    movePhantomPlaceholder(dropInfo) {
        if (!this.dragState || !this.dragState.placeholder) return;

        const { stackId, insertIndex } = dropInfo;

        // Clear all drop zone highlights first
        const allZones = this.container.querySelectorAll('.new-stack-button');
        allZones.forEach(z => z.classList.remove('drop-zone-active'));

        // Handle new stack button
        if (stackId === '__NEW_STACK__') {
            const newStackButton = this.container.querySelector('.new-stack-button');
            if (newStackButton) {
                newStackButton.classList.add('drop-zone-active');
            }
            // Hide placeholder when over new stack button
            if (this.dragState.placeholder.parentNode) {
                this.dragState.placeholder.style.display = 'none';
            }
            return;
        }

        // Show placeholder again if it was hidden
        if (this.dragState.placeholder) {
            this.dragState.placeholder.style.display = '';
        }

        const stackZone = this.container.querySelector(`.stack-cards[data-stack-id="${stackId}"]`);
        if (!stackZone) return;

        // Get all visible cards (excluding the hidden original and existing placeholder)
        const cardElements = Array.from(stackZone.querySelectorAll('.hand-card:not([style*="display: none"]):not(.card-placeholder)'));

        // Calculate target element to insert before
        let targetElement = null;
        if (insertIndex >= cardElements.length) {
            // Insert at end - find the drop-zone element or append to stack
            const dropZone = stackZone.querySelector('.stack-drop-zone');
            targetElement = dropZone;
        } else {
            // Insert before specific card
            targetElement = cardElements[insertIndex];
        }

        // Only move if the position actually changed
        const currentNext = this.dragState.placeholder.nextElementSibling;
        if (currentNext !== targetElement) {
            // Remove from current position
            if (this.dragState.placeholder.parentNode) {
                this.dragState.placeholder.parentNode.removeChild(this.dragState.placeholder);
            }

            // Insert at new position
            if (targetElement) {
                stackZone.insertBefore(this.dragState.placeholder, targetElement);
            } else {
                stackZone.appendChild(this.dragState.placeholder);
            }
        }
    }

    /**
     * Emit drag start event for global handlers
     */
    emitDragStart(card) {
        document.dispatchEvent(new CustomEvent('cardDragStart', {
            detail: { card, manager: this }
        }));
    }

    /**
     * Emit drag move event
     */
    emitDragMove(x, y) {
        document.dispatchEvent(new CustomEvent('cardDragMove', {
            detail: { x, y, card: this.dragState.card }
        }));
    }

    /**
     * Emit drag end event and return drop target if any
     */
    emitDragEnd(x, y) {
        const event = new CustomEvent('cardDragEnd', {
            detail: { x, y, card: this.dragState.card },
            cancelable: true
        });
        document.dispatchEvent(event);
        return event.defaultPrevented ? event.detail.dropTarget : null;
    }

    /**
     * Emit drag cleanup event
     */
    emitDragCleanup() {
        document.dispatchEvent(new CustomEvent('cardDragCleanup'));
    }

    /**
     * Handle auto-scrolling when dragging near edges
     */
    handleAutoScroll(cursorY) {
        const scrollContainer = this.container;
        const rect = scrollContainer.getBoundingClientRect();

        const scrollZoneSize = 80; // pixels from edge to trigger scroll
        const maxScrollSpeed = 15; // pixels per frame

        const distanceFromTop = cursorY - rect.top;
        const distanceFromBottom = rect.bottom - cursorY;

        let scrollSpeed = 0;

        // Check if near top edge
        if (distanceFromTop < scrollZoneSize && distanceFromTop > 0) {
            // Scroll up - speed increases as cursor gets closer to edge
            const intensity = 1 - (distanceFromTop / scrollZoneSize);
            scrollSpeed = -intensity * maxScrollSpeed;
        }
        // Check if near bottom edge
        else if (distanceFromBottom < scrollZoneSize && distanceFromBottom > 0) {
            // Scroll down - speed increases as cursor gets closer to edge
            const intensity = 1 - (distanceFromBottom / scrollZoneSize);
            scrollSpeed = intensity * maxScrollSpeed;
        }

        // Start or update scrolling
        if (scrollSpeed !== 0) {
            this.startAutoScroll(scrollSpeed);
        } else {
            this.stopAutoScroll();
        }
    }

    /**
     * Start auto-scrolling
     */
    startAutoScroll(speed) {
        // If already scrolling at this speed, don't restart
        if (this.autoScrollInterval && this.autoScrollSpeed === speed) {
            return;
        }

        this.stopAutoScroll();
        this.autoScrollSpeed = speed;

        this.autoScrollInterval = setInterval(() => {
            const scrollContainer = this.container;
            scrollContainer.scrollTop += speed;

            // Update drop position while scrolling
            if (this.dragState) {
                const dropInfo = this.getDropPosition(this.dragState.currentX, this.dragState.currentY);
                if (dropInfo && this.hasDropInfoChanged(dropInfo, this.dragState.currentDropInfo)) {
                    this.movePhantomPlaceholder(dropInfo);
                    this.dragState.currentDropInfo = dropInfo;
                }
            }
        }, 16); // ~60fps
    }

    /**
     * Stop auto-scrolling
     */
    stopAutoScroll() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
            this.autoScrollSpeed = 0;
        }
    }

    /**
     * Get drop target at coordinates
     */
    getDropTarget(x, y) {
        const dropZones = this.container.querySelectorAll('.stack-cards');

        for (const zone of dropZones) {
            const rect = zone.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return zone;
            }
        }

        return null;
    }

    /**
     * Get precise drop position (stack and index) at coordinates
     */
    getDropPosition(x, y) {
        // Check if hovering over new stack button
        const newStackButton = this.container.querySelector('.new-stack-button');
        if (newStackButton) {
            const rect = newStackButton.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                // Hovering over new stack button - return special indicator
                return { stackId: '__NEW_STACK__', insertIndex: 0 };
            }
        }

        // Find which stack we're over
        const stackZone = this.getDropTarget(x, y);
        if (!stackZone) return null;

        const stackId = stackZone.dataset.stackId;
        const stack = this.stacks.find(s => s.id === stackId);
        if (!stack) return null;

        // Get all card elements in this stack (excluding the dragging card and drop indicators)
        const cardElements = Array.from(stackZone.querySelectorAll('.hand-card:not(.dragging):not(.drop-indicator)'));

        if (cardElements.length === 0) {
            // Empty stack - drop at beginning
            return { stackId, insertIndex: 0 };
        }

        // Find insertion point between cards
        for (let i = 0; i < cardElements.length; i++) {
            const cardEl = cardElements[i];
            const rect = cardEl.getBoundingClientRect();
            const cardMidX = rect.left + rect.width / 2;

            // If cursor is before the midpoint of this card, insert before it
            if (x < cardMidX) {
                return { stackId, insertIndex: i };
            }
        }

        // Drop at the end
        return { stackId, insertIndex: cardElements.length };
    }

    /**
     * Update drop indicator visual
     */
    updateDropIndicator(dropInfo) {
        // Remove all existing drop indicators
        const existingIndicators = this.container.querySelectorAll('.drop-indicator');
        existingIndicators.forEach(ind => ind.remove());

        // Remove drop-active class from all zones
        const allZones = this.container.querySelectorAll('.stack-cards');
        allZones.forEach(zone => zone.classList.remove('drop-active'));

        if (!dropInfo) return;

        // Find the target stack zone
        const stackZone = this.container.querySelector(`.stack-cards[data-stack-id="${dropInfo.stackId}"]`);
        if (!stackZone) return;

        stackZone.classList.add('drop-active');

        // Create drop indicator line
        if (dropInfo.insertIndex !== undefined) {
            const indicator = document.createElement('div');
            indicator.className = 'drop-indicator';

            const cardElements = Array.from(stackZone.querySelectorAll('.hand-card:not(.dragging)'));

            if (cardElements.length === 0 || dropInfo.insertIndex === 0) {
                // Insert at beginning
                stackZone.insertBefore(indicator, stackZone.firstChild);
            } else if (dropInfo.insertIndex >= cardElements.length) {
                // Insert at end
                stackZone.appendChild(indicator);
            } else {
                // Insert before specific card
                stackZone.insertBefore(indicator, cardElements[dropInfo.insertIndex]);
            }
        }
    }

    /**
     * Show all drop zones
     */
    showDropZones() {
        const dropZones = this.container.querySelectorAll('.stack-drop-zone');
        dropZones.forEach(zone => zone.classList.add('visible'));
    }

    /**
     * Hide all drop zones
     */
    hideDropZones() {
        const dropZones = this.container.querySelectorAll('.stack-drop-zone, .drop-active');
        dropZones.forEach(zone => {
            zone.classList.remove('visible', 'drop-active');
        });
    }

    /**
     * Move card to a different stack
     */
    moveCardToStack(card, targetStackId) {
        const sourceStack = this.stacks.find(s => s.id === card.stackId);
        const targetStack = this.stacks.find(s => s.id === targetStackId);

        if (!sourceStack || !targetStack || sourceStack === targetStack) return;

        // Remove from source
        const cardIndex = sourceStack.cards.findIndex(c => c.id === card.id);
        if (cardIndex === -1) return;

        sourceStack.cards.splice(cardIndex, 1);

        // Add to target
        card.stackId = targetStackId;
        targetStack.cards.push(card);

        this.render();
        this.onCardMove(card, sourceStack.id, targetStack.id);
    }

    /**
     * Move card to specific position in a stack
     */
    moveCardToPosition(card, targetStackId, insertIndex) {
        const sourceStack = this.stacks.find(s => s.id === card.stackId);
        const targetStack = this.stacks.find(s => s.id === targetStackId);

        if (!sourceStack || !targetStack) return;

        // Remove from source
        const cardIndex = sourceStack.cards.findIndex(c => c.id === card.id);
        if (cardIndex === -1) return;

        console.log('Moving card from index', cardIndex, 'to index', insertIndex, 'in stack', targetStackId);

        const [movedCard] = sourceStack.cards.splice(cardIndex, 1);

        // If moving within the same stack and the card was before the insert position,
        // adjust the insert index
        if (sourceStack === targetStack && cardIndex < insertIndex) {
            insertIndex--;
            console.log('Adjusted insert index to', insertIndex);
        }

        // Insert at specific position
        movedCard.stackId = targetStackId;
        targetStack.cards.splice(insertIndex, 0, movedCard);

        console.log('Card order after move:', targetStack.cards.map(c => c.id));

        // Clean up empty groups
        this.cleanupEmptyStacks();

        this.render();
        this.onCardMove(movedCard, sourceStack.id, targetStack.id);
    }

    /**
     * Show card context menu (long press)
     */
    showCardContextMenu(card, cardEl, event) {
        // TODO: Implement context menu for card actions
        console.log('Context menu for card:', card);
    }

    /**
     * Show sort menu
     */
    showSortMenu(stackId, button) {
        const menu = document.createElement('div');
        menu.className = 'sort-menu';
        menu.innerHTML = `
            <button class="sort-option" data-sort="suit">By Suit</button>
            <button class="sort-option" data-sort="rank">By Rank</button>
            <button class="sort-option" data-sort="wild">Wild First</button>
        `;

        // Position near button
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';

        // Temporarily add to DOM to measure size
        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);
        const menuRect = menu.getBoundingClientRect();

        // Calculate position with viewport boundary detection
        let top = rect.bottom + 5;
        let left = rect.left;

        // Check if menu would overflow bottom of viewport
        if (top + menuRect.height > window.innerHeight) {
            // Position above button instead
            top = rect.top - menuRect.height - 5;
        }

        // Check if menu would overflow right of viewport
        if (left + menuRect.width > window.innerWidth) {
            // Align right edge of menu with right edge of button
            left = rect.right - menuRect.width;
        }

        // Ensure menu doesn't go off left edge
        if (left < 0) {
            left = 5;
        }

        // Ensure menu doesn't go off top edge
        if (top < 0) {
            top = 5;
        }

        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        menu.style.visibility = 'visible';

        // Add click handlers
        menu.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', () => {
                const sortType = option.dataset.sort;
                this.sortStack(stackId, sortType);
                menu.remove();
            });
        });

        // Close on outside click
        const closeHandler = (e) => {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);

        document.body.appendChild(menu);
    }

    /**
     * Create persistent "New Group" button
     */
    createNewStackButton() {
        const button = document.createElement('div');
        button.className = 'new-stack-button';
        button.dataset.isNewStackZone = 'true';

        button.innerHTML = `
            <div class="new-stack-indicator">
                <div class="new-stack-icon">+</div>
                <div class="new-stack-text">New Group</div>
            </div>
        `;

        // Click handler - create new stack
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.createStackAuto();
        });

        return button;
    }

    /**
     * Create a new stack with auto-generated name
     */
    createStackAuto() {
        // Start at Group 2 since the default stack will be Group 1
        const stackNumber = this.stacks.length + 1;
        const name = `Group ${stackNumber}`;
        return this.createStack(name);
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Note: We no longer prevent touchstart by default to allow scrolling
        // Individual card event listeners handle preventing default only when dragging
    }

    /**
     * Destroy the card hand manager
     */
    destroy() {
        this.container.innerHTML = '';
        this.stacks = [];
        this.selectedCards.clear();
        this.dragState = null;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardHandManager;
}
