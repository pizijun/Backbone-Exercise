$(function() {
    var PModel = Backbone.Model.extend({ //父类的模型
        defaults: {
            name: "empty",
            children: 0
        },
    });
    var SModel = Backbone.Model.extend({ //子类的模型
        defaults: {
            name: "empty",
            children: 0,
            pid: "empty",
        },
    });
    var TaskModel = Backbone.Model.extend({ //任务模型
        defaults: {
            title: "empty",
            date: "empty",
            content: "empty",
            sid: "empty",
            done: false
        },
        toggle: function() {
            this.save({
                done: true
            });
        }
    });
    var PCollects = Backbone.Collection.extend({ //父类的集合
        model: PModel,
        localStorage: new Backbone.LocalStorage("gtd-parent"),
        getModelByPid:function(pid){
            return this.get(pid);
        }
    });
    var parents = new PCollects;

    var SCollects = Backbone.Collection.extend({ //子类的集合
        model: SModel,
        localStorage: new Backbone.LocalStorage("gtd-sub"),
    });
    var subs = new SCollects;

    var TCollects = Backbone.Collection.extend({ //任务集合
        model: TaskModel,
        localStorage: new Backbone.LocalStorage("gtd-task"),
        getModelBySid: function(sid) {
            return this.where({
                sid: sid
            });
        },
    });
    var tasks = new TCollects;

    var PView = Backbone.View.extend({ //父类View
        tagName: "li",
        className: "category-item",
        events: {
            "click .pdestroy .fa-times": "removePCls",
            "click a": "showAlltask"
        },
        pClsTemplate: _.template($("#parentCls-template").html()),
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "all", this.render);
            this.listenTo(this.model, "destroy", this.remove);
        },
        render: function() {
            this.$el.html(this.pClsTemplate({
                id: this.model.cid,
                name: this.model.get("name"),
                children: this.model.get("children")
            })); //渲染模板
            this.el.id = this.model.cid; //设置模板li的id
            return this;
        },
        removePCls: function(e) {
            e.stopPropagation();
            pApp.setNum(this.model.cid,"-","p");
            this.model.destroy();
            var cid = this.model.cid;
            pApp.selectOptions.find("option[value='" + cid + "']").remove(); //在删除父类时同时删除下拉框的选项
            var subAElet = this.$el.find('ul').find('a');
            _.each(subAElet, function(item) {
                var sid = $(item).data("sid");
                _.invoke([subs.get(sid)], "destroy");
                _.invoke(tasks.getModelBySid(sid), "destroy");
            });
        },
        showAlltask: function(e) {
            pApp.switchSelectedStyle(this.$el.find("a:first"), "picked");
            pApp.hideTaskList();
            _.each(this.$el.find('a').next().find('a'), function(item, index) {
                pApp.showTaskBySid($(item).data('sid'));
            });
            pApp.backToAll(pApp.getDataSid());
        }
    });

    var SView = Backbone.View.extend({ //子类的View
        tagName: "li",
        sClsTemplate: _.template($("#subCls-template").html()),
        events: {
            "click .sdestroy .fa-times": "removeSCls",
            "click a": "showTask"
        },
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "all", this.render);
            this.listenTo(this.model, "destroy", this.remove);
        },
        render: function() {
            this.$el.html(this.sClsTemplate({id: this.model.cid,name: this.model.get("name"),children: this.model.get("children")})); //渲染模板
            return this;
        },
        removeSCls: function(e) {
            e.stopPropagation(); //阻止事件冒泡
            if (!confirm("确定真的要删除吗？")) {return;}
            var sid = this.$el.find('a').data("sid");
            this.model.destroy();
            _.invoke(tasks.getModelBySid(sid), "destroy");
        },
        showTask: function(e) {
            e.stopPropagation(); //阻止事件冒泡
            pApp.switchSelectedStyle(this.$el.find('a'), "selected");
            pApp.hideTaskList();
            pApp.showTaskBySid(this.$el.find('a').data('sid'));
            pApp.backToAll(this.$el.find('a').data('sid'));
        }
    });

    var TView = Backbone.View.extend({ //任务列表的View
        tagName: "li",
        taskTemplate: _.template($("#tasklist-template").html()),
        events: {
            "click a": "triggerShowDetail",
            "click .tdestroy .fa-times": "removeTask"
        },
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "destroy", this.remove);
        },
        render: function() {
            this.$el.html(this.taskTemplate({id: this.model.cid,done: this.model.get("done"),title: this.model.get("title")}));
            return this;
        },
        removeTask: function(e) {
            e.stopPropagation(); //阻止事件冒泡
            if (!confirm("确定真的要删除吗？")) {return;}
            _.invoke([this.model], "destroy");
        },
        remove: function() {
            if (this.$el.parent().children().length == 1) {
                this.$el.parents("div")[0].remove();
            } else {
                this.$el.remove();
            }
        },
        switchChoosenStyle: function(element, className) {
            element.addClass(function() {
                if ($(".choosen")) {
                    $(".choosen").removeClass();
                }
                return className;
            })
        },
        triggerShowDetail: function(e) {
            e.stopPropagation(); //阻止事件冒泡
            this.switchChoosenStyle(this.$el.find('a'), "choosen");
            pApp.showDetailedTaskById(this.$el.find('a').data('tid'))
        }
    });

    var DView = Backbone.View.extend({
        tagName: "div",
        className: "show-wrap",
        taskDetailTemplate: _.template($("#taskdetail-template").html()),
        events: {
            "click .confirm": "toggleDone",
            "click .edit": "modify",
        },
        initialize: function() {
            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "destroy", this.remove);
        },
        render: function() {
            this.$el.html(this.taskDetailTemplate(this.model.toJSON()));
            this.el.id = this.model.cid;
            return this;
        },
        toggleDone: function() {
            this.model.toggle();
        },
        modify: function(obj) {
            pApp.rightArea.children().hide();
            pApp.editingArea.show();
            pApp.inputTitle.val(this.model.get("title"))
            pApp.inputDate.val(this.model.get("date"))
            pApp.inputContent.val(this.model.get("content"));
        }
    });
    var AppView = Backbone.View.extend({
        el: "body",
        selectTemplate: _.template($("#select-template").html()),
        events: {
            "click #add-class i": "popup",
            "click #ok": "creatCls",
            "click #cancle": "vanish",
            "click .head i": "vanish",
            "click .add-task i": "showEditingArea",
            "click .sure": "confirmHandler",
            "click .abolish": "cancelEdit",
            "click a[data-sid='subMoren']": "showDefaultTask",
            "click a[data-pid='moren']": "setDefault",
            "click #tab-trigger": "toggleFinishStats"
        },
        initialize: function() {
            this.listenTo(parents, "add", this.addPCls); //当有父类模型添加到collections时就会触发
            this.listenTo(subs, "add", this.addSCls); //当有子类模型添加到collections时就会触发
            this.listenTo(tasks, "add", this.addTask);
            this.listenTo(tasks, "all", this.render);

            this.modal = $("#popup");
            this.newClsInput = $("#new-class");
            this.selectOptions = $("#parent-class");
            this.editingArea = $(".editing-area");

            this.inputTitle = $("#title-input");
            this.inputDate = $("#date-input");
            this.inputContent = $("#content-input");

            this.rightArea = $(".right");
            this.allTaskWrap = $("#tab-content-all");

            this.defaultPNum = $(".pnum");
            this.defaultSNum = $(".snum");
            //取得数据
            parents.fetch();
            subs.fetch();
            tasks.fetch();
            this.setDefault();
        },
        render: function() {
            var totalNum = 0;
            $(".category-item").children(":even").map(function(){
                var plength = 0;
                $(this).next().find('a').map(function(){
                    var sid = $(this).data("sid");
                    var slength = tasks.getModelBySid(sid).length;
                    plength += slength;
                    $(this).find("span").eq(1).text(slength);
                })
                totalNum += plength;
                $(this).find('span').eq(1).text(plength);
            })
            $(".total-sum").text(totalNum);
        },
        setDefault: function() { //加载选中默认分类
            this.switchSelectedStyle($("[data-pid='moren']"), "picked");
            this.hideTaskList();
            this.showTaskBySid("subMoren");
            this.backToAll("subMoren");
        },
        showDefaultTask: function() {
            this.switchSelectedStyle($("[data-sid='subMoren']"), "selected");
            this.hideTaskList();
            this.showTaskBySid("subMoren");
            this.backToAll("subMoren");
        },
        addPCls: function(parentCls) { //添加父类
            this.viewP = new PView({model: parentCls});
            this.$("#category-list").append(this.viewP.render().el);
            this.selectOptions.
            append(this.selectTemplate({
                id: this.viewP.model.cid,
                name: this.viewP.model.get("name")
            })); //同时向下拉框中添加父类
        },
        addSCls: function(subCls) { //添加子类
            this.viewS = new SView({model: subCls});
            this.$("#" + subCls.get("pid")).find('ul').append(this.viewS.render().el);
        },
        addTask: function(task) { //添加任务列表
            this.viewT = new TView({model: task});
            this.viewD = new DView({model: task});
            this.$(".right").append(this.viewD.render().el);
            var div = $("#" + task.get("sid") + "-" + task.get("date"));
            if (div.length > 0) {
                div.find("ul").append(this.viewT.render().el);
            } else {
                this.$("#tab-content-all").append(this.processTaskElet(task, this.viewT.render().el));
            }
        },
        popup: function() { //弹出pop框
            this.modal.show();
        },
        vanish: function() { //隐藏pop框并清除输入框的内容
            this.modal.hide();
            this.newClsInput.val("");
        },
        showEditingArea: function(e) { //显示编辑区域
            e.stopPropagation();
            if ($(".picked").length == 0 && $(".selected").length == 0) {
                confirm("请选中一个在一个分类下添加任务");
                return;
            }
            $(".choosen").removeClass();
            this.rightArea.children().hide();
            this.editingArea.show();
        },
        getEditingInputs: function() { //获取编辑域的内容
            var title = this.inputTitle.val();
            var date = this.inputDate.val();
            var content = this.inputContent.val();
            return {title: title,date: date,content: content}
        },
        confirmHandler: function(e) { //确认添加/修改 任务
            e.stopPropagation();
            var taskObj = this.getEditingInputs();
            if ($(".choosen").length != 0) {
                var tid = $(".choosen").data("tid");
                tasks.get(tid).save({title: taskObj.title,date: taskObj.date,content: taskObj.content});
                $("#" + tid).show();
                $(".choosen").parents("ul").prev().text(taskObj.date);
            } else {
                var dataSid = this.getDataSid();
                if (dataSid == null) {
                    dataSid = "subMoren";
                }
                tasks.create({
                    title: taskObj.title,
                    date: taskObj.date,
                    content: taskObj.content,
                    sid: dataSid
                });
            }
            this.cancelEdit();
        },
        cancelEdit: function() { //取消正在编辑的任务
            this.editingArea.hide();
            this.inputTitle.val("");
            this.inputDate.val("");
            this.inputContent.val("");
        },
        creatCls: function(e) { //创建父类或子类的模型，并存储到相应集合
            e.stopPropagation();
            var pid = this.selectOptions.val();
            if (pid == "moren") {
                confirm("不能为默认分类创建子分类");
                return;
            }
            var cls = this.newClsInput.val();
            var optionValue = this.selectOptions.val();
            if (optionValue == "nothing") {
                parents.create({name: cls});
            } else {
                subs.create({name: cls,pid: pid});
            }
            this.vanish();
        },
        switchSelectedStyle: function(element, className) {
            element.addClass(function() {
                if ($(".picked") || $(".selected")) {
                    $(".picked").removeClass();
                    $(".selected").removeClass();
                }
                return className;
            })
        },
        processTaskElet: function(task, el) {
            var divContain = $("<div id='" + task.get("sid") + "-" + task.get("date") + "'></div>").
            wrapInner("<p>" + task.get("date") + "</p>" + "<ul></ul>");
            divContain.find("ul").append(el);
            return divContain;
        },
        hideTaskList: function() {
            this.allTaskWrap.children().hide();
        },
        showTaskBySid: function(sid) {
            _.each(this.allTaskWrap.children(), function(item) {
                if (item.id.indexOf(sid) != -1) {
                    $(item).show();
                }
            });
        },
        getDataSid: function() {
            var picked = $(".picked");
            var selected = $(".selected");
            var dataPid = picked.data("pid");
            var dataSid = selected.data("sid");
            if (dataPid != null) {
                dataSid = picked.next().find('a').first().data("sid")
            }
            return dataSid;
        },
        setChoosenDefaultTask: function(sid) {
            var arr = [];
            if (sid == null) {
                this.rightArea.children().hide();
            }
            _.each(this.allTaskWrap.children(), function(item) {
                if (item.id.indexOf(sid) != -1) {
                    arr.push($(item));
                }
            });
            if (arr.length == 0) {
                this.rightArea.children().hide();
                return;
            }
            this.viewT.switchChoosenStyle(arr[0].find('a').first(), "choosen");
            var tid = arr[0].find('a').first().data("tid");
            this.showDetailedTaskById(tid);
        },
        showDetailedTaskById: function(tid) {
            this.rightArea.children().hide();
            this.rightArea.children('#' + tid).show();
        },
        setNum: function(dataid,sign,tsp) {//数量关系
            var total = $(".total-sum");
            var totalSum = parseInt(total.text());
            var pnum = $("[data-pid='"+dataid+"']").find("span").eq(1).text();
            total.text(totalSum - parseInt(pnum));
        },
        toggleFinishStats: function(e) {//切换'所有','完成','未完成'
            e = e || window.event;
            e.preventDefault();
            var target = e.srcElement ? e.srcElement : e.target;
            if (target.tagName != "A") {return;}
            this.switchTriggerNowStyle($(target), "trigger-now")
            var allWrap = this.getTaskListWrap();
            var noDoneWrap = $(allWrap).filter(function() {
                if ($(this).find("a#done").length == 0) {return true;}
            });
            var allDoneWrap = $(allWrap).filter(function() {
                if ($(this).find("a#done").length == $(this).find("a").length) {return true;};
            });
            var allAEelemnt = $(allWrap).find('a');
            var notFinished = allAEelemnt.filter(function() {
                if ($(this).attr("id") != "done") {return true}
            });
            var finished = $(allWrap).children().find('a#done');
            if ($(target).text() == "所有") {
                allAEelemnt.show();
                $(allWrap).show()
            } else if ($(target).text() == "未完成") {
                finished.hide();
                allDoneWrap.hide();
                notFinished.show();
                noDoneWrap.show();
                this.viewT.switchChoosenStyle(notFinished.first(), "choosen");
                this.showDetailedTaskById(notFinished.first().data("tid"))
            } else if ($(target).text() == "已完成") {
                notFinished.hide();
                noDoneWrap.hide();
                finished.show();
                allDoneWrap.show();
                this.viewT.switchChoosenStyle(finished.first(), "choosen");
                this.showDetailedTaskById(finished.first().data("tid"))
            }
        },
        switchTriggerNowStyle: function(elem, className) {
            elem.addClass(function() {
                if ($(".trigger-now")) {
                    $(".trigger-now").removeClass("trigger-now");
                }
                return className;
            })
        },
        getTaskListWrap: function() {
            if ($(".picked").length != 0) {
                var subList = $(".picked").next().find("a");
                var allWrap = [];
                var that = this;
                subList.each(function(index, elet) {
                    that.allTaskWrap.children().each(function(i, item) {
                        if (item.id.indexOf($(elet).data("sid")) != -1) {
                            allWrap.push(item);
                        }
                    });
                })
            } else if ($(".selected").length != 0) {
                var allWrap = this.allTaskWrap.children().filter(function() {
                    if (this.id.indexOf($(".selected").data("sid")) != -1) {
                        return true;
                    }
                });
            }
            return allWrap;
        },
        backToAll: function(sid) {
            var allWrap = this.getTaskListWrap();
            $(allWrap).show();
            $(allWrap).find('a').show();
            this.switchTriggerNowStyle($("[href='#tab-content-all']"), "trigger-now");
            this.setChoosenDefaultTask(sid);
        }
    });
    var pApp = new AppView;
})
