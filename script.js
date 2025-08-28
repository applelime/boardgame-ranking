document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const dateSelect = document.getElementById('date-select');
    const yearSelect = document.getElementById('year-select');
    const playersSelect = document.getElementById('players-select');
    const weightSelect = document.getElementById('weight-select');
    const rankTypeSelect = document.getElementById('rank-type-select');
    const tableBody = document.getElementById('table-body');
    const tableHeader = document.getElementById('table-header');
    const paginationContainer = document.getElementById('pagination');
    const filterToggleButton = document.getElementById('filter-toggle-button');
    const filtersContainer = document.getElementById('filters-container');
    const activeFiltersContainer = document.getElementById('active-filters');

    let allGames = [];
    let filteredGames = [];
    let currentPage = 1;
    const itemsPerPage = 10;
    let wasDesktop = window.innerWidth > 992;
    let lastWindowWidth = window.innerWidth;

    const csvFiles = ['data/boardgames_re_ranked_2025-08-24.csv'];

    function populateDateFilter() {
        csvFiles.forEach(file => {
            const option = document.createElement('option');
            const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
            option.value = file;
            option.textContent = dateMatch ? dateMatch[1] : file;
            dateSelect.appendChild(option);
        });
    }

    function loadData(file) {
        Papa.parse(file, {
            download: true,
            header: true,
            dynamicTyping: true,
            complete: (results) => {
                allGames = results.data.filter(g => g.id);
                applyFilters();
            }
        });
    }

    function applyFilters() {
        let tempGames = [...allGames];

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            tempGames = tempGames.filter(g => g.name && typeof g.name === 'string' && g.name.toLowerCase().includes(searchTerm));
        }

        const yearFilter = yearSelect.value;
        if (yearFilter !== 'all') {
            const currentYear = new Date().getFullYear();
            const yearsAgo = parseInt(yearFilter, 10);
            tempGames = tempGames.filter(g => g.yearpublished >= currentYear - yearsAgo);
        }

        const playersFilter = playersSelect.value;
        if (playersFilter !== 'all') {
            const numPlayers = parseInt(playersFilter, 10);
            tempGames = tempGames.filter(g => {
                const recommended = g.recommended_players;
                if (typeof recommended === 'number') {
                    return numPlayers === 10 ? recommended >= 10 : recommended === numPlayers;
                }
                if (typeof recommended === 'string' && recommended) {
                    const supportedPlayers = recommended.split('|').map(Number);
                    if (numPlayers === 10) {
                        return supportedPlayers.some(p => p >= 10);
                    }
                    return supportedPlayers.includes(numPlayers);
                }
                return false;
            });
        }

        const weightFilter = weightSelect.value;
        if (weightFilter !== 'all') {
            const [minWeight, maxWeight] = weightFilter.split('-').map(parseFloat);
            tempGames = tempGames.filter(g => g.weight >= minWeight && g.weight <= maxWeight);
        }

        const rankType = rankTypeSelect.value;
        if (rankType === 'new') {
            tempGames.sort((a, b) => a.new_rank - b.new_rank);
        } else {
            tempGames.sort((a, b) => a.original_rank - b.original_rank);
        }

        filteredGames = tempGames;
        currentPage = 1;
        render();
        renderActiveFilters();
    }

    function render() {
        renderTableHeader();
        renderTableBody();
        renderPagination();
    }

    function renderTableHeader() {
        const isMobile = window.innerWidth <= 768;
        let headerHtml;
        if (isMobile) {
            headerHtml = `
                <th class="rank-header">#</th>
                <th class="name-header">게임 정보</th>
            `;
        } else {
            headerHtml = `
                <th class="rank-header">#</th>
                <th class="thumbnail-cell">이미지</th>
                <th class="name-header">이름</th>
                <th class="year">출시연도</th>
                <th class="weight">난이도</th>
                <th class="rating">평점</th>
                <th class="players">추천 인원</th>
            `;
        }
        tableHeader.innerHTML = headerHtml;
    }

    function renderTableBody() {
        tableBody.innerHTML = '';
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageGames = filteredGames.slice(startIndex, endIndex);
        const isMobile = window.innerWidth <= 768;

        if (pageGames.length === 0) {
            const colspan = isMobile ? 2 : 7;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 3rem;">표시할 게임이 없습니다.</td></tr>`;
            return;
        }

        const rankType = rankTypeSelect.value;
        const isNewRank = rankType === 'new';

        pageGames.forEach(game => {
            const row = document.createElement('tr');
            const rank = isNewRank ? game.new_rank : game.original_rank;
            const rating = isNewRank ? game.bayes_new_rating.toFixed(3) : game.average.toFixed(3);

            let playersText = 'N/A';
            const players = game.recommended_players;
            if (typeof players === 'number') {
                playersText = `${players}인`;
            } else if (typeof players === 'string' && players) {
                const playerCounts = players.split('|').map(Number).filter(n => !isNaN(n));
                if (playerCounts.length > 0) {
                    const min = Math.min(...playerCounts);
                    const max = Math.max(...playerCounts);
                    playersText = min === max ? `${min}인` : `${min}-${max}인`;
                }
            }

            let weightClass = '';
            const weight = game.weight;
            if (weight < 2) weightClass = 'weight-easy';
            else if (weight < 3) weightClass = 'weight-medium';
            else if (weight < 4) weightClass = 'weight-hard';
            else weightClass = 'weight-expert';

            if (isMobile) {
                row.innerHTML = `
                    <td colspan="2">
                        <div class="mobile-game-card">
                            <div class="main-row">
                                <div class="rank">${rank}</div>
                                <div class="thumbnail-cell">
                                    <img src="${game.thumbnail}" alt="${game.name || 'N/A'}" class="thumbnail">
                                </div>
                                <div class="name">
                                    <a href="https://boardgamegeek.com/boardgame/${game.id}" target="_blank">${game.name || '이름 없음'}</a>
                                </div>
                            </div>
                            <div class="details-row">
                                <div class="detail-item">
                                    <span class="detail-label">출시연도</span>
                                    <span class="detail-value">${game.yearpublished}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">난이도</span>
                                    <span class="weight-badge ${weightClass}">${game.weight.toFixed(2)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">평점</span>
                                    <span class="detail-value">${rating}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">추천 인원</span>
                                    <span class="detail-value">${playersText}</span>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
            } else {
                const nameClass = game.name && game.name.length > 35 ? 'name long-name' : 'name';
                row.innerHTML = `
                    <td class="rank">${rank}</td>
                    <td class="thumbnail-cell"><img src="${game.thumbnail}" alt="${game.name || 'N/A'}" class="thumbnail"></td>
                    <td class="${nameClass}">
                        <a href="https://boardgamegeek.com/boardgame/${game.id}" target="_blank">${game.name || '이름 없음'}</a>
                    </td>
                    <td class="year">${game.yearpublished}</td>
                    <td class="weight">
                        <span class="weight-badge ${weightClass}">${game.weight.toFixed(2)}</span>
                    </td>
                    <td class="rating">${rating}</td>
                    <td class="players">${playersText}</td>
                `;
            }
            tableBody.appendChild(row);
        });
    }

    function getPagesToShow() {
        const screenWidth = window.innerWidth;
        if (screenWidth <= 480) {
            return 4; // Small mobile (e.g., iPhone SE)
        } else if (screenWidth <= 768) {
            return 7; // Larger mobile / Small tablet portrait
        } else { // > 768px
            return 10; // iPad portrait and up
        }
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
        if (totalPages <= 1) return;

        const createButton = (text, page, isDisabled = false, classes = []) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.disabled = isDisabled;
            if (classes.length > 0) button.classList.add(...classes);
            button.addEventListener('click', () => {
                if (currentPage === page) return;
                currentPage = page;
                render();
                paginationContainer.focus();
            });
            return button;
        };

        const pageBlock = getPagesToShow();
        paginationContainer.appendChild(createButton('이전', Math.max(1, currentPage - pageBlock), currentPage === 1));

        const maxPagesToShow = getPagesToShow();
        let startPage, endPage;
        if (totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.ceil(maxPagesToShow / 2) - 1;
            const maxPagesAfterCurrent = Math.floor(maxPagesToShow / 2);

            if (currentPage <= maxPagesBeforeCurrent + 1) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const classes = i === currentPage ? ['active'] : [];
            paginationContainer.appendChild(createButton(i, i, false, classes));
        }

        paginationContainer.appendChild(createButton('다음', Math.min(totalPages, currentPage + pageBlock), currentPage === totalPages));
    }

    function renderActiveFilters() {
        activeFiltersContainer.innerHTML = '';
        const isMobile = window.innerWidth <= 768;
        const filters = [
            { el: yearSelect, label: '출시 연도', default: 'all' },
            { el: playersSelect, label: '게임 인원', default: 'all' },
            { el: weightSelect, label: '게임 난이도', default: 'all' },
            { el: rankTypeSelect, label: '순위 기준', default: 'original' },
            { el: searchInput, label: '게임 이름', default: '' }
        ];

        let hasActiveFilters = false;
        let colorIndex = 0;

        filters.forEach(filter => {
            if (filter.el.value !== filter.default) {
                hasActiveFilters = true;
                const chip = document.createElement('div');
                chip.classList.add('filter-chip', `color-${(colorIndex % 5) + 1}`);
                
                const selectedOption = filter.el.querySelector(`option[value="${filter.el.value}"]`);
                const valueText = filter.el.tagName === 'INPUT' ? filter.el.value : selectedOption.textContent;

                let chipText;
                if (isMobile && filter.el !== searchInput) {
                    chipText = `<span>${valueText}</span>`;
                } else {
                    chipText = `<span>${filter.label}: ${valueText}</span>`;
                }

                chip.innerHTML = `
                    ${chipText}
                    <button class="remove-chip">&times;</button>
                `;

                chip.querySelector('.remove-chip').addEventListener('click', () => {
                    filter.el.value = filter.default;
                    applyFilters();
                });
                activeFiltersContainer.appendChild(chip);
                colorIndex++;
            }
        });
        activeFiltersContainer.style.display = hasActiveFilters ? 'flex' : 'none';
    }

    function setupFilterToggle() {
        const isDesktop = window.innerWidth > 992;
        if (isDesktop) {
            // On desktop, always show filters and set button state to open (though hidden)
            filtersContainer.classList.add('open');
            filterToggleButton.classList.add('open');
        } else {
            // On mobile, if we just switched from desktop, hide filters.
            if (wasDesktop) {
                filtersContainer.classList.remove('open');
                filterToggleButton.classList.remove('open');
            }
        }
        wasDesktop = isDesktop;
    }

    filterToggleButton.addEventListener('click', () => {
        filtersContainer.classList.toggle('open');
        filterToggleButton.classList.toggle('open');
    });

    searchButton.addEventListener('click', applyFilters);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });

    dateSelect.addEventListener('change', (e) => loadData(e.target.value));
    [yearSelect, playersSelect, weightSelect, rankTypeSelect].forEach(sel => {
        sel.addEventListener('change', applyFilters);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWindowWidth) {
            setupFilterToggle();
            lastWindowWidth = window.innerWidth;
        }
        render();
        renderActiveFilters(); // Re-render chips on resize for mobile text changes
    });

    populateDateFilter();
    if (csvFiles.length > 0) {
        loadData(csvFiles[0]);
    }
    setupFilterToggle();
});