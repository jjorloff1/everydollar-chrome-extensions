console.log("Running extension Content Script.");

const settingKeys = ["extensionsStatus", "excludedCategories", "bankAccountName"];
var extensionsStatus;
var excludedCategories;
var bankAccountName;

/* Given a function which would return an element or NodeList, this function indicates
 * whether that element is displayed on the page */
var elementExistsOnPage = function (elementFunction) {
    var element = elementFunction();
    if (element == null || (element instanceof NodeList && element.length == 0)) {
        return false;
    }

    return true;
};

/* This is a timer method to trigger functions once an element has actually loaded on screen */
var executeAfterElementLoaded = function(elementFunction, callback) {
    console.log("Waiting for element to load.");
    var checkExist = setInterval(function () {
        console.log("Checking if element exists.");

        if (!!elementExistsOnPage(elementFunction)) {
            console.log("Element exists! Executing function.");
            clearInterval(checkExist);

            callback();
        }
    }, 100);
};

var openBankAccountPanel = function () {
    console.log("Opening accounts modal invisibly.");
    document.querySelector(".AccountIcon").click();
};

var closeBankAccountPanel = function () {
    console.log("Closing accounts modal.");
    document.querySelector("#Modal_close").click();
};

var convertMoneyStringToNumber = function(moneyString) {
    return moneyString.replace('$', '').replace(',', '');
};

var bankAccountElements = function() {
    return document.querySelectorAll(".BankAccount");
};

var retreiveAccountBalanceFromModal = function (accountName) {
    console.log("Retrieving account balance for account: " + accountName);
    var bankElements = bankAccountElements();

    var accountBalance = 0.00;
    bankElements.forEach(function(item) {
        var itemAccountName = item.querySelector(".BankAccount-name").innerText;
        console.log("Account Name: " + itemAccountName);

        if (accountName == itemAccountName) {
            var accountBalanceString = item.querySelector(".BankAccount-balance .money").dataset.text;
            console.log("Account " + accountName + " balance is " + accountBalanceString);
            accountBalance += convertMoneyStringToNumber(accountBalanceString);
        }
    });

    return accountBalance;
};

var retrieveAccountBalance = function (balance, callback) {
    console.log("Color coding the account balance calculation.");

    var cssRuleIndex = document.styleSheets[1].insertRule(".ReactModalPortal { display: none !important; }");
    openBankAccountPanel();

    executeAfterElementLoaded(bankAccountElements, function() {
        var accountBalance = retreiveAccountBalanceFromModal(bankAccountName);

        closeBankAccountPanel();
        document.styleSheets[1].deleteRule(cssRuleIndex);

        callback(accountBalance);
    });
};

var isCategoryExcludedByConfig = function(item) {
    var itemLabel = item.parentElement.parentElement.parentElement.querySelector(".BudgetItem-label");

    console.log("Currently configured excluded categories: " + excludedCategories);
    return excludedCategories.includes(itemLabel.dataset.text);
};

/* Favorites appear twice on a page so we need to exclude them from calculation. */
var isCategoryInFavorites = function(item) {
    var categoryGroupElement = item.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement
    console.log(item + " favorite:" + categoryGroupElement.classList.contains("Budget-budgetGroup--favorites"));
    return categoryGroupElement.classList.contains("Budget-budgetGroup--favorites");
};

var isCategoryExcluded = function(item) {
    return isCategoryExcludedByConfig(item) || isCategoryInFavorites(item);
};

var calculateBudgetNeedForBudgetItem = function(item) {
    if(isCategoryExcluded(item)) {
        return 0;
    }

    var value = convertMoneyStringToNumber(item.dataset.text)
    return  parseFloat(value) * 100;
};

var calculateBudgetNeedForDebtItem = function(item) {
    var itemPlanned = item.querySelector(".BudgetItemRow-input--amountBudgeted");
    var itemPaidSoFar = item.querySelector(".BudgetItemRow-column:has(.BudgetItemRow-input--amountBudgeted) + .BudgetItemRow-column:has(.money.BudgetItem-secondColumn)").querySelector(".money.BudgetItem-secondColumn");
    if(isCategoryExcluded(itemPaidSoFar)) {
        return 0;
    }

    var valuePlanned = convertMoneyStringToNumber(itemPlanned.value);
    var valuePaidSoFar = convertMoneyStringToNumber(itemPaidSoFar.dataset.text);
    return parseFloat(valuePlanned) * 100 - (parseFloat(valuePaidSoFar) * 100);
}

var calculateBudgetNeed = function () {
    var sum = 0.00;

    // Calculater budget need for regular budget items that tell us how much is remaining
    var allValues = document.querySelectorAll(".money--remaining");
    allValues.forEach((item) => sum += calculateBudgetNeedForBudgetItem(item));

    // Calculate budget need for debts, which have a different layout
    var allDebts = document.querySelectorAll(".Budget-budgetGroup--debt .BudgetItemRow");
    allDebts.forEach((item) => sum += calculateBudgetNeedForDebtItem(item));

    return sum / 100;
};

var calculateBalanceDifference = function (budgetNeed, accountBalance) {
    return accountBalance - budgetNeed;
};

var budgetPageElement = function () {
    return document.querySelector(".Budget-groupsList");
};

var remainingValuesDisplayed = function () {
    return !!document.querySelector(".money--remaining");
};

var accountBalanceElement = function () {
    return document.querySelector(".extensions-AccountBalance");
};

var accountBalanceHtmlDisplayed = function () {
    return !!accountBalanceElement();
};

var accountBalanceHtml = function ({ budgetNeedFormatted,
                                     accountBalanceFormatted,
                                     balanceDifferenceFormatted } = {}) {
    return '<div class="extensions-AccountBalance">\n' +
        '  <ul class="BudgetOverviewList list-block BudgetOverview-list">\n' +
        '    <li class="BudgetOverviewList-item list-item small ui-content">\n' +
        '      <div class="ui-flex-row">\n' +
        '        <div class="BudgetOverviewList-label ui-flex-column-6" data-text="Balance Needed">Budget Need</div>\n' +
        '        <div class="ui-flex-column-2 ui-flex-column--column text--right" data-text="Refresh">\n' +
        '        </div>\n' +
        '        <div class="BudgetOverviewList-value ui-flex-column-4 ui-flex-column--column text--right" ' +
        '             data-text="' + budgetNeedFormatted + '">' + budgetNeedFormatted + '\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </li>\n' +
        '    <li class="BudgetOverviewList-item list-item small ui-content">\n' +
        '      <div class="ui-flex-row">\n' +
        '        <div class="BudgetOverviewList-label ui-flex-column-6" data-text="Account Balance">Account Balance' +
        '        </div>\n' +
        '        <div class="ui-flex-column-2 ui-flex-column--column text--right" data-text="Refresh">\n' +
        '        </div>\n' +
        '        <div class="BudgetOverviewList-value ui-flex-column-4 ui-flex-column--column text--right" ' +
        '             data-text="' + accountBalanceFormatted + '">' + accountBalanceFormatted + '\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </li>\n' +
        '    <li class="BudgetOverviewList-item list-item small ui-content">\n' +
        '      <div class="ui-flex-row">\n' +
        '        <div class="BudgetOverviewList-label ui-flex-column-6" data-text="Balance Difference">Balance Difference' +
        '        </div>\n' +
        '        <div class="ui-flex-column-2 ui-flex-column--column text--right" data-text="Refresh">\n' +
        '        </div>\n' +
        '        <div class="BudgetOverviewList-value ui-flex-column-4 ui-flex-column--column text--right" ' +
        '             data-text="' + balanceDifferenceFormatted + '">' + balanceDifferenceFormatted + '\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </li>\n' +
        '  </ul>\n' +
        '</div>';
};

var refreshLinkElement = function () {
    return document.querySelector(".extensions-Navbar-balanceRefreshLink");
};

var refreshLinkElementDisplayed = function () {
    return !!refreshLinkElement();
};

var refreshLinkHtml = function () {
    return '<li>\n' +
        '    <a class="extensions-Navbar-balanceRefreshLink Navbar-item"' +
        '       title="Refresh account balance calculation">\n' +
        '        <span class="Navbar-icon"><strong>&#10227;</strong></span>\n' +
        '        <span class="Navbar-iconTitle">E$ Extensions</span>'
        '    </a>\n' +
        '</li>';
};

var addRefreshLinkToNav = function() {
    if (refreshLinkElementDisplayed()) {
        console.log("Refresh link already on navbar.")
        return;
    }

    console.log("Adding refresh link to Navbar.");

    var navBarListElement = document.querySelector(".Navbar-content .list-block");
    navBarListElement.insertAdjacentHTML("beforeend", refreshLinkHtml());

    refreshLinkElement().addEventListener("click", syncSettingsAndExecuteCalculations);
};

var colorCodeBalance = function (balanceDifference) {
    // After We know the balance difference, lets color code it for easy spotting and provide a tooltip
    var accountBalanceElement = document.querySelector(".extensions-AccountBalance .BudgetOverviewList-value");

    var balanceNotification;
    var color;
    if (balanceDifference < 0) {
        balanceNotification = "Account balance too low for budget needs. Danger! Have you configured you Bank Account Name in the extension settings? Maybe bank transactions just need to be categorized?";
        color = "red";
    } else if (balanceDifference == 0) {
        balanceNotification = "Account balance matches budget needs. All Good.";
        color = "green";
    } else {
        balanceNotification = "Account balance too high for budget needs. Maybe transactions haven't hit the bank yet?";
        color = "orange";
    }

    accountBalanceElement.setAttribute("style", "color: " + color + ";");

    console.log(balanceNotification);
    accountBalanceElement.setAttribute("title", balanceNotification);
};

var formatCurrencyOrIndicateFetching = function (currencyNumber) {
    if (currencyNumber != null) {
        return Number(currencyNumber).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    } else {
        return "Fetching...";
    }
};

var displayBudgetNeedsAndBalanceDifference = function ({ budgetNeed,
                                                         accountBalance,
                                                         balanceDifference } = {}) {
    console.log("Injecting budget needs and balance difference html into page.");

    var params = {
        budgetNeedFormatted: formatCurrencyOrIndicateFetching(budgetNeed),
        accountBalanceFormatted: formatCurrencyOrIndicateFetching(accountBalance),
        balanceDifferenceFormatted: formatCurrencyOrIndicateFetching(balanceDifference)
    };

    if (accountBalanceHtmlDisplayed()) {
        accountBalanceElement().outerHTML = accountBalanceHtml(params)
    } else {
        var sidebar = document.querySelector(".OperationsPanel");
        sidebar.insertAdjacentHTML("afterbegin", accountBalanceHtml(params));
    }

    colorCodeBalance(balanceDifference);
};

var calculateAndDisplayBudgetNeedsBalance = function () {
    if (!elementExistsOnPage(budgetPageElement)) {
        return;
    }

    var displayedValuesSwitched = false;
    if (!remainingValuesDisplayed()) {
        document.querySelector(".BudgetItemRow-swappableColumn").click();
        displayedValuesSwitched = true;
    }

    var budgetNeed = calculateBudgetNeed();

    displayBudgetNeedsAndBalanceDifference({ budgetNeed: budgetNeed });

    retrieveAccountBalance(budgetNeed, function(accountBalance) {
        var balanceDifference = calculateBalanceDifference(budgetNeed, accountBalance);

        displayBudgetNeedsAndBalanceDifference({
            budgetNeed: budgetNeed,
            accountBalance: accountBalance,
            balanceDifference: balanceDifference
        });
    });

    // Switch column back if necessary
    if (displayedValuesSwitched) {
        document.querySelector(".BudgetItemRow-swappableColumn").click();
    }
};

var setExtensionsStatus = function (extensionsStatusSettingData) {
    if (extensionsStatusSettingData) {
        console.log("Setting extensionsStatus with value: " + extensionsStatusSettingData);
        extensionsStatus = extensionsStatusSettingData.trim();
    }
};

var setExcludedCategories = function(excludedCategoriesListString) {
    excludedCategories = [];
    if (excludedCategoriesListString) {
        console.log("Setting excludedCategories with value: " + excludedCategoriesListString);

        if (excludedCategoriesListString.includes(",")) {
            excludedCategories = excludedCategoriesListString.split(",").map((category) => {
                return category.trim();
            });
        } else {
            excludedCategories.push(excludedCategoriesListString.trim());
        }
    }

    console.log("Excluded Categories: " + excludedCategories);
};

var setBankAccountName = function (bankAccountNameSettingData) {
    if (bankAccountNameSettingData) {
        console.log("Setting bankAccountName with value: " + bankAccountNameSettingData);
        bankAccountName = bankAccountNameSettingData.trim();
    }
};

var syncSettingsAndExecuteCalculations = function() {
    chrome.storage.sync.get(settingKeys, function(data) {
        setExtensionsStatus(data["extensionsStatus"]);
        setExcludedCategories(data["excludedCategories"]);
        setBankAccountName(data["bankAccountName"]);

        if (extensionsStatus != "disabled") {
            calculateAndDisplayBudgetNeedsBalance();
        } else {
            console.log("EveryDollar Extensions disabled.");

            if (accountBalanceHtmlDisplayed()) {
                accountBalanceElement().remove();
            }
        }
    });
};

console.log("Waiting for budget page to load.");
executeAfterElementLoaded(budgetPageElement, function() {
    console.log("Budget page loaded.  Starting Bank Account Calculation.");

    syncSettingsAndExecuteCalculations();

    addRefreshLinkToNav();
});
