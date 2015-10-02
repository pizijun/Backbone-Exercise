$(function(){

	//model
	//注意此处定义defaults属性，若直接定义为一个对象字面量，会报错，找不到nextOrder函数
	var Todo = Backbone.Model.extend({
		defaults:function(){
			return {
				title: "empty...",
				order: Todos.nextOrder(),
				done: false
		};
		},
		toggle:function(){
			this.save({done: !this.get("done")});
		}

	});

	//collection
	var TodoList = Backbone.Collection.extend({
		model: Todo,
		localStorage: new Backbone.LocalStorage("my-todo"),
		done:function(){
			return this.where({done:true});
		},
		remaining:function(){
			return this.where({done:false});
		},
		nextOrder:function(){
			if(!this.length) return 1;
			return this.last().get("order") + 1;
		},
		comparator: "order"

	});
	var  Todos  = new TodoList;


	//Todo View
	var TodoView = Backbone.View.extend({
		tagName: "li",
		template: _.template($("#item-template").html()),
		events:{
			"click .destroy" : "removeOne",
			"dblclick .view" : "edit",
			"keypress #edit" : "updateOnenter",
			"blur #edit" : "close",
			"click #toggle-done" : "toggleDone"

		},
		initialize:function(){
			this.listenTo(this.model,"change",this.render);
			this.listenTo(this.model,"destroy",this.remove);
			// Todos.fetch();
		},
		render:function(){
			this.$el.html(this.template(this.model.toJSON()));//渲染模板
			this.input = this.$("#edit");
			this.$el.find('label').toggleClass('done',this.model.get("done"));
			return this;
		},
		removeOne:function(){
			this.model.destroy();
		},
		edit:function(){
			this.input.show();
			this.input.focus();
		},
		updateOnenter:function(e){
			if(e.keyCode == 13) this.close();
		},
		close:function(){
			var value = this.input.val();
			if(!value){
				this.removeOne();
			}else{
				this.model.save({title:value});
				this.input.hide();
			}
		},
		toggleDone:function(){

			/*var done = this.model.get("done");
			if(!done){
				this.model.save({done:true});
			}else{
				this.model.save({done:false});
			}*/
			this.model.toggle();
		}
	});


	//App View
	var AppView = Backbone.View.extend({
		el : $("#container"),
		statusTem : _.template($("#stats-template").html()),
		events:{
			"keypress #new-todo" : "createOnenter",
			"click #toggle-all" : "toggelAll"
		},
		initialize:function(){
			this.input = this.$("#new-todo");
			this.allCheckbox = this.$("#toggle-all")[0];

			this.listenTo(Todos,"add",this.addOne);
			this.listenTo(Todos,"all",this.render);//所有事件发生都会触发all事件

			this.footer = this.$("footer");
			this.main = this.$("#main");
			Todos.fetch();//取出数据

		},
		render:function(){
			var done = Todos.done().length;
			var remaining = Todos.remaining().length;

			if(Todos.length){
				this.main.show();
				this.footer.show();
				this.footer.html(this.statusTem({done:done,remaining:remaining}));//渲染模板

			}else{
				this.main.hide();
				this.footer.hide();
			}

			this.allCheckbox.checked = !remaining;//根据剩余的改变其状态
		},
		addOne:function(todo){//将添加的模型传到todoview中去，渲染好模板，append到dom中
			// alert(todo.get("done"));
			var view = new TodoView({model:todo});
			this.$("#todo-list").append(view.render().el);
			this.main.show();
			this.footer.show();
		},
		createOnenter:function(e){//从输入框取数据,并向集合中添加(且存储到localstorage)模型
			if(e.keyCode != 13) return;
			if(!this.input.val()) return;
			Todos.create({title:this.input.val()});
			this.input.val("");
		},
		toggelAll:function(){
			Todos.each(function(todo){
				todo.toggle();
			});
		}

	});
	var App = new AppView;
});