var canvas, // Canvas DOM element
    ctx,
    keys,
    agent,
    env,
    simulateRunId = 0,
    simulateStartTimer = null,
    totalSimulations = 0,
    totalGoldCaptured = 0,
    goldCapturedThisRun = false,
    isAlive = true,
    isFinished = false,
    player;

function restart() {
    if (!env) {
        env = new Environment(4, 4, 64, 64);
    }

    // We need to create a new environment if it is the first time of the player won
    if (isFinished) {
        env = new Environment(4, 4, 64, 64);
    } else {
        env.restart();
    }

    player = new Player(env, 0, 0);

    $("#modal-win").modal("hide");
    $("#modal-game-over").modal("hide");
    $("#btn-remove-walls").prop("checked", false);

    resources.stop("game-over");
    resources.stop("win");
    resources.play("theme", false);

    ((isAlive = true), (isFinished = false), animate());
}

// Browser window resize
function resizeCanvas() {
    canvas.width = env.width * env.i;
    canvas.height = env.height * env.j;
}

// // Keyboard key down
// function onKeydown(e) {
//     // if (player) {
//     // 	keys.onKeyDown(e);
//     // };
//     keys.onKeyDown(e);

//     animate();
// }

function startSimulation(options = {}) {
    simulateRunId += 1;
    const { stepDelayMs = 250 } = options;
    return simulate(simulateRunId, stepDelayMs);
}

function scheduleSimulation() {
    if (simulateStartTimer) {
        clearTimeout(simulateStartTimer);
    }
    simulateStartTimer = setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                void startSimulation();
            });
        });
    }, 2000);
}

async function simulate(runId, stepDelayMs) {
    console.log("started");
    agent = new LogicalAgent();
    goldCapturedThisRun = false;
    var percepts = animate();
    for (
        var i = 1;
        i <= 500 && !isFinished && isAlive && runId === simulateRunId;
        ++i
    ) {
        agent.tell(percepts);
        keys = agent.ask();
        percepts = animate();
        if (stepDelayMs > 0) {
            await new Promise((res) => {
                setTimeout(() => {
                    res("works");
                }, stepDelayMs);
            });
        }
    }
    if (runId !== simulateRunId) {
        return null;
    }
    totalSimulations += 1;
    if (goldCapturedThisRun) {
        totalGoldCaptured += 1;
    }
    updateSimulationStats();
    return player ? player.score : 0;
}

async function runInitialBatch(count) {
    for (let i = 0; i < count; i++) {
        if (i > 0) {
            restart();
            resizeCanvas();
        }
        await startSimulation({ stepDelayMs: 250 });
    }
}

function updateSimulationStats() {
    const percentage =
        totalSimulations > 0
            ? (totalGoldCaptured / totalSimulations) * 100
            : 0;
    $("#gold-capture-rate").html(percentage.toFixed(2) + "%");
    $("#total-simulations").html(totalSimulations);
}

function update() {
    const action = player.update(keys);
    if (action.move) {
        player.score -= 10;
    }

    var deadWumpus = player.kill(keys);

    if (deadWumpus) {
        env.removeWumpus(deadWumpus);
    }

    var isAtStart = player.getPosI() === 0 && player.getPosJ() === 0;
    if (isAtStart && keys.enter) {
        keys.enter = false;
        isFinished = true;
    }

    var capturedGold = player.capture(keys);

    if (capturedGold) {
        goldCapturedThisRun = true;
        player.score += 1000;

        env.removeGold(capturedGold);

        resources.play("gold");
    }

    if (env.hasAHole(player) || env.hasAWumpus(player)) {
        player.score -= 1000;
        isAlive = false;
    }

    $("#score").html(player.score);
    $("#arrow").html(player.arrow);
    $("#gold").html(env.golds.length);

    if (!isAlive) {
        if (agent && typeof agent.getAllClauses === "function") {
            console.log({ clauses: agent.getAllClauses() });
        }
        displayGameOver();
    }

    if (isFinished) {
        displayCongratulations();
        if (agent && typeof agent.getAllClauses === "function") {
            console.log({ clauses: agent.getAllClauses() });
        }
    }

    const envPercepts = env.percept(player);

    return {
        bump: action.bump,
        ...envPercepts,
    };
}

function displayGameOver() {
    $("#modal-game-over").modal("show");
    resources.play("game-over", false);
    resources.stop("theme");
}

function displayCongratulations() {
    $("#modal-win").modal("show");
    resources.play("win", false);
    resources.stop("theme");
}

function draw() {
    // Wipe the canvas clean
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (env) {
        env.draw(ctx);
    }

    if (player) {
        player.draw(ctx);
    }
}

function animate() {
    const percepts = update();
    draw();
    return percepts;
}

function getURL() {
    var url = "{";

    url += '"holes":' + encodeToArray(env.holes) + ",";
    url += '"golds":' + encodeToArray(env.golds) + ",";
    url += '"wumpus":' + encodeToArray(env.wumpus) + "}";

    return "#" + btoa(url);
}

function encodeToArray(array) {
    return JSON.stringify(array);
}

function getLink() {
    return window.location.href + getURL();
}

function loadEnvironment(hash) {
    var link = atob(hash.replace("#", ""));

    var obj = $.parseJSON(link);

    env.holes = obj.holes;
    env.golds = obj.golds;
    env.wumpus = obj.wumpus;

    animate();
}

function getCurrentVolume() {
    return localStorage.getItem("wws-volume") || 0.1;
}

function changeVolumeTo(level) {
    console.log("Changing volume to", level);

    Howler.volume(level);

    localStorage.setItem("wws-volume", level);
}

function getCurrentLanguage() {
    return localStorage.getItem("wws-locale") || "en_us";
}

function changeLanguageTo(locale) {
    console.log("Changing language to", locale);

    if (locale == "ar") {
        $("html[lang=en]").attr("dir", "rtl");
    } else {
        $("html[lang=en]").attr("dir", "ltr");
    }

    // Define the current language
    $.i18n().locale = locale;
    // Change all text on the webpage
    $("body").i18n();
    // We need to refresh the bootstrap-select
    $("#select-language").selectpicker("refresh");
    // Save the current locate on the locale storage to reload
    localStorage.setItem("wws-locale", locale);
    // We need to redraw the canvas as well
    draw();
}

$(function () {
    console.log("Welcome to Wumpus World Simulator");

    // Declare the canvas and rendering context
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    keys = new Keys();

    // To style all selects
    $("select").selectpicker({
        dropdownAlignRight: true,
    });

    $.i18n.debug = true;

    $.i18n({
        locale: getCurrentLanguage(),
    });

    $.i18n()
        .load({
            en_us: "i18n/en_us.json",
            pt_br: "i18n/pt_br.json",
            ar: "i18n/ar.json",
            fr: "i18n/fr.json",
            tr_TR: "i18n/tr_TR.json",
            es_mx: "i18n/es_mx.json",
        })
        .done(function () {
            changeLanguageTo($.i18n().locale);
        });

    $("#select-language").selectpicker("val", $.i18n().locale);

    $("#select-language").change(function (event) {
        event.preventDefault();
        changeLanguageTo($(this).val());
    });

    $("#btn-remove-walls").change(function () {
        env.removeWalls = this.checked;
        // Remove focus
        $(this).blur();
        animate();
    });

    $(".btn-restart").click(function () {
        restart();
        scheduleSimulation();
    });

    $(".card-game").width(canvas.width);
    $(".card-game .card-content").height(canvas.height);

    $("#modal-share").on("shown.bs.modal", function () {
        $("#textarea-link").text(getLink());
    });

    changeVolumeTo(getCurrentVolume());

    $("#btn-volume").val(getCurrentVolume().toString());

    $("#btn-volume").change(function (event) {
        event.preventDefault();
        changeVolumeTo($(this).val());
    });

    updateSimulationStats();

    resources.load().then(() => {
        resources.play("theme", false);

        var hash = window.location.hash;

        if (hash) {
            loadEnvironment(hash);
        }

        restart();
        resizeCanvas();
        animate();
        void runInitialBatch(50);
    });
});
