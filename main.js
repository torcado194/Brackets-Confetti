define(function (require, exports, module) {
    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeMirror          = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        Menus               = brackets.getModule("command/Menus");         
    
    var editor     = {},
        cm         = {},
        root       = {},
        canvas     = {},
        c          = {},
        cursors    = [],
        bubbles    = [],
        changes    = 0,
        offsetTop  = 0,
        offsetLeft = 0,
        resetTimer = 0;
    
    var CONFETTI_COMMAND_NAME    = "Enable Confetti",
        CONFETTI_COMMAND_ID      = "torcado.toggleConfetti",
        SCREENSHAKE_COMMAND_NAME = "Enable Screenshake",
        SCREENSHAKE_COMMAND_ID   = "torcado.toggleScreenshake",
        GUIDE_CLASS              = "torcado.confetti";
    
    //USER VARIABLES
    var enableConfetti      = true,
        enableScreenshake   = false, //DOM redraw events from CodeMirror makes screenshake pretty laggy, but it's here if you want it.
        shakeIntensity      = 6,
        confettiAmount      = 50,
        gravity             = false, //Makes confetti fall
        prefs               = PreferencesManager.getExtensionPrefs("torcado.confetti");
    
    
    prefs.definePreference("enableConfetti", "boolean", enableConfetti, {
        description: "Toggle Confetti"
    });
    prefs.definePreference("enableScreenshake", "boolean", enableScreenshake, {
        description: "Toggle Screenshake"
    });
    prefs.definePreference("confettiAmount", "number", confettiAmount, {
        description: "Number of Spawned Confetti Objects"
    });
    prefs.definePreference("shakeIntensity", "number", shakeIntensity, {
        description: "Screenshake Intensity"
    });
    
    AppInit.appReady(function () {
        setTimeout(function () {
            $("body").append('<link rel="stylesheet" href="' + ExtensionUtils.getModulePath(module) + 'main.less">');
            
            $("body").prepend('<canvas id="torcado-canvas"></canvas>');
            canvas = document.getElementById('torcado-canvas');
            c = canvas.getContext('2d');
            
            init();
            changeFile();
            
            window.requestAnimationFrame(step);
            $(window).resize(init);
            
            CommandManager.register(CONFETTI_COMMAND_NAME, CONFETTI_COMMAND_ID, toggleConfetti); 
            Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(CONFETTI_COMMAND_ID);
            CommandManager.register(SCREENSHAKE_COMMAND_NAME, SCREENSHAKE_COMMAND_ID, toggleScreenshake); 
            Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(SCREENSHAKE_COMMAND_ID);
            
            prefs.on("change", function () {
                applyPreferences();
            });
            applyPreferences();
            
            $(DocumentManager).on("currentDocumentChange", changeFile);
        }, 2000);
    });
    
    function Bubble(x, y, dx, dy, r, c){
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.g = 0;
        this.r = r;
        this.c = c;
        this.update = function(){
            this.x += this.dx;
            this.y += this.dy;
            if(gravity){
                this.y += this.g;
                this.g += 0.1;
            }
            this.dx *= 0.9;
            this.dy *= 0.9;
            this.r *= 0.9;
            if(this.r < 0.5){
                bubbles.splice(bubbles.indexOf(this), 1);
            }
        }
    }
    
    function init(){
        editor = EditorManager.getCurrentFullEditor();
        root = editor.getRootElement();
        
        canvas.width = $(root).width();
        canvas.height = $(root).height();
        offsetTop = $(root).offset().top;
        offsetLeft = $(root).offset().left;
        
        $("#torcado-canvas").css({"top": offsetTop, "left": offsetLeft});
    }
    
    function changeFile(){
        editor = EditorManager.getCurrentFullEditor();
        root = editor.getRootElement();
        if (!editor) {
            return;
        }
        cm = editor._codeMirror;
        cm.on("change", function (codeMirror, change) {
            burst(changes, (change.text[0] == ";" ? 5 : 1)); //Second parameter of Burst, mult, multiplies confetti amount by this much. Typing a semicolon multiplies by 5
            changes++;
        });
        init();
    }
    
    function step(time){
        if(enableConfetti){
            if(bubbles.length > 0){
                window.requestAnimationFrame(step);
            }
            
            c.clearRect(0,0,canvas.width,canvas.height);
            
            for(var i = 0; i < bubbles.length; i++){
                var b = bubbles[i];
                b.update();
                c.fillStyle = b.c; 
                c.beginPath();
                c.arc(b.x, b.y, b.r, 0, Math.PI * 2, false);
                c.fill();
            }
            
            if(resetTimer < 0){
                $(root).css({"transform": "none"});
                resetTimer = 0;
            } else {
                resetTimer--;
            }
            changes = 0;
        }
    }
    
    function burst(i, mult){
        if(bubbles.length == 0){
            window.requestAnimationFrame(step);
        }
        if(enableScreenshake){
            if(resetTimer <= 0){
                $(root).css({"transform": "translate(" + (Math.random() * (shakeIntensity) - (shakeIntensity / 2)) + "px, " + (Math.random() * (shakeIntensity) - (shakeIntensity / 2)) + "px)"})
                resetTimer = 3;
            }
        }
        if(enableConfetti){
            cursors = $(".CodeMirror-cursor, .CodeMirror-selected", root);
            if(cursors != undefined && cursors[i] != undefined){
                for(var j = 0; j < Math.ceil((confettiAmount == 1 ? 1 : (confettiAmount / (cursors.length / 1.75))) * mult); j++){
                    var dir = Math.random() * Math.PI * 2;
                    bubbles.push(new Bubble($(cursors[i]).offset().left - offsetLeft, $(cursors[i]).offset().top - offsetTop + 7, Math.cos(dir) * (Math.random() * 15 + 2), Math.sin(dir) * (Math.random() * 15 + 2), Math.random() * 12 + 8, "hsl(" + (Math.random() * 360) + ", 100%, 75%)")); //You can change the colors here if you want
                }
            }
        }
    }
    
    function toggleConfetti() {
        enableConfetti = !enableConfetti;
        prefs.set("enableConfetti", enableConfetti);
        prefs.save();
        CommandManager.get(CONFETTI_COMMAND_ID).setChecked(enableConfetti);
        if(enableConfetti){
            window.requestAnimationFrame(step);
        }
    }
    
    function toggleScreenshake() {
        enableScreenshake = !enableScreenshake;
        prefs.set("enableScreenshake", enableScreenshake);
        prefs.save();
        CommandManager.get(SCREENSHAKE_COMMAND_ID).setChecked(enableScreenshake);
    }
    
    function applyPreferences() {
        enableConfetti    = prefs.get("enableConfetti");
        enableScreenshake = prefs.get("enableScreenshake");
        shakeIntensity    = prefs.get("shakeIntensity");
        confettiAmount    = prefs.get("confettiAmount");
        CommandManager.get(CONFETTI_COMMAND_ID).setChecked(enableConfetti);
        CommandManager.get(SCREENSHAKE_COMMAND_ID).setChecked(enableScreenshake);
    }
});