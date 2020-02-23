console.log("Running extension Content Script.");

const settingKeys = ["excludedCategories", "bankAccountName"];
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
    document.querySelector("#IconTray_accounts").click();
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
    var categoryGroupElement = item.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement
    return categoryGroupElement.classList.contains("Budget-budgetGroup--favorites");
};

var isCategoryExcluded = function(item) {
    return isCategoryExcludedByConfig(item) || isCategoryInFavorites(item);
};

var calculateBudgetNeedsBalance = function () {
    var sum = 0.00;
    var allValues = document.querySelectorAll(".money--remaining");
    allValues.forEach(function (item) {
        if(!isCategoryExcluded(item)) {
            var value = convertMoneyStringToNumber(item.dataset.text)
            sum += parseFloat(value) * 100;
        }
    });
    return sum / 100;
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

var accountBalanceHtml = function (balance) {
    var balanceFormatted = Number(balance).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
    return '<div class="extensions-AccountBalance">\n' +
        '  <ul class="BudgetOverviewList list-block BudgetOverview-list">\n' +
        '    <li class="BudgetOverviewList-item list-item small ui-content">\n' +
        '      <div class="ui-flex-row">\n' +
        '        <div class="BudgetOverviewList-label ui-flex-column-6" data-text="Balance Needed">Balance Needed</div>\n' +
        '        <div class="BudgetOverviewList-value ui-flex-column-4 ui-flex-column--column text--right" ' +
        '             data-text="' + balanceFormatted + '">' + balanceFormatted + '\n' +
        '        </div>\n' +
        '        <div class="extensions-AccountBalance-refresh ui-flex-column-2 ui-flex-column--column text--right" data-text="Refresh">\n' +
        '          <a class="extensions-AccountBalance-refreshLink"><strong>&#10227;</strong></a>\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </li>\n' +
        '  </ul>\n' +
        '</div>';
};

var retrieveAccountBalanceAndAddColorCoding = function (balance) {
    retrieveAccountBalance(balance, function(accountBalance) {
        // After We know the balance, lets color code it for easy spotting and provide a tooltip
        var accountBalanceElement = document.querySelector(".extensions-AccountBalance .BudgetOverviewList-value");

        var balanceNotification;
        if (balance > accountBalance) {
            balanceNotification = "Account balance too low for budget needs. Danger! Have you configured you Bank Account Name in the extension settings? Maybe bank transactions just need to be categorized?";
            accountBalanceElement.setAttribute("style", "color: red;");
        } else if (balance == accountBalance) {
            balanceNotification = "Account balance matches budget needs. All Good.";
            accountBalanceElement.setAttribute("style", "color: green;");
        } else {
            balanceNotification = "Account balance too high for budget needs. Maybe transactions haven't hit the bank yet?";
            accountBalanceElement.setAttribute("style", "color: orange;");
        }

        console.log(balanceNotification);
        accountBalanceElement.setAttribute("title", balanceNotification);
    });
};

var displayBudgetNeedsBalance = function (balance) {
    var balanceStr = "Injecting balance calculation html into page.";

    console.log(balanceStr);

    if (accountBalanceHtmlDisplayed()) {
        accountBalanceElement().outerHTML = accountBalanceHtml(balance)
    } else {
        var sidebar = document.querySelector(".ui-app-budget-details");
        sidebar.insertAdjacentHTML("afterbegin", accountBalanceHtml(balance));
    }

    document.querySelector(".extensions-AccountBalance-refreshLink").addEventListener("click", syncSettingsAndExecuteCalculations);

    retrieveAccountBalanceAndAddColorCoding(balance);
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

    var balance = calculateBudgetNeedsBalance();

    displayBudgetNeedsBalance(balance);

    if (displayedValuesSwitched) {
        document.querySelector(".BudgetItemRow-swappableColumn").click();
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
        setExcludedCategories(data["excludedCategories"]);
        setBankAccountName(data["bankAccountName"]);

        calculateAndDisplayBudgetNeedsBalance();
    });
};

console.log("Waiting for budget page to load.");
executeAfterElementLoaded(budgetPageElement, function() {
    console.log("Budget page loaded.  Starting Bank Account Calculation.");
    console.log("Will recalculate every minute.");
    setInterval(syncSettingsAndExecuteCalculations, 60000);
    syncSettingsAndExecuteCalculations();

});