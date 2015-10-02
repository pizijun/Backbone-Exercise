$(function(){

	var Contact = Backbone.Model.extend({
		defaults:{
			name : "empty",
			phone: "empty",
			email: "empty",
			el: {}//对模板的一个引用，为了方便搜索用
		}
	});

	var ContactList = Backbone.Collection.extend({
		model: Contact,
		localStorage: new Backbone.LocalStorage("my-contact")
	});
	var contacts = new ContactList;



	var ContactView = Backbone.View.extend({
		tagName : "tr",
		template: _.template($("#contact-template").html()),
		events:{
			"click .contact-delete" : "deleteOneItem",
			"click .contact-edit" : "edit",
		},
		initialize:function(){
			this.listenTo(this.model,"change",this.render);
			this.listenTo(this.model,"destroy",this.remove);
		},
		render:function(){
			this.$el.html(this.template(this.model.toJSON()));

			//取得对编辑的引用（注意一定要在模板渲染后取得）
			this.cname = this.$("#cname");
			this.cphone = this.$("#cphone");
			this.cemail = this.$("#cemail");

			return this;
		},
		deleteOneItem:function(){
			this.model.destroy();
		},
		edit:function(){
			this.cname.show();
			this.cphone.show();
			this.cemail.show();
		}
	});



	var AppView = Backbone.View.extend({
		el:"body",
		statsTemplate: _.template($("#status-template").html()),
		events:{
			"click #addbtn" : "createOnclick",
			"click #contact-add" : "popup",
			"click #cancelbtn" : "vanish",
			"click #contact-save" : "saveItem",
			"click #contact-search" : "doSearch",
		},
		initialize:function(){
			this.inputName = $("#inputName");//初始化时取得对添加框里文本域的引用
			this.inputPhone = $("#inputMobile");
			this.inputEmail = $("#inputEmail");
			this.modal = $("#addModal");//取得对弹出层的引用
			this.titleBar = $("#title-bar");
			this.saveBtn = this.$("#savebtn-wrap");
			this.navBarRight = this.$(".navbar-right");
			this.searchArea = this.$("#search-area");

			this.listenTo(contacts,"add",this.addOne);//为模型添加add事件
			this.listenTo(contacts,"all",this.render);
			contacts.fetch();//取出数据
		},
		render:function(){
			var len = contacts.length;
			if(len > 0){
				this.titleBar.show();
				this.saveBtn.show();
				this.navBarRight.html(this.statsTemplate({length:len}));
			}else{
				this.titleBar.hide();
				this.saveBtn.hide();
			}
		},
		addOne:function(todo){
			this.view = new ContactView({model:todo});//实例化ContactView
			this.$("#contact-list").append(this.view.render().el);

			// console.log(this.view.$el);
			// console.log(this.view.model.get("name"));
			this.view.model.set({el:this.view.$el});//设置模型的el属性的值，其为对此模型对应的模板的一个引用
		},
		createOnclick:function(e){
			var inputname = this.inputName.val();
			var inputphone = this.inputPhone.val();
			var inputemail = this.inputEmail.val();
			if(!inputname || !inputphone || !inputphone){
				return;
			}
			contacts.create({name:inputname,phone:inputphone,email:inputemail});
			this.modal.hide();
			this.clearContent();
		},
		popup:function(e){//弹出pop框
			e.preventDefault();
			// this.modal.show();
			this.modal.css({"display":"block","visibility":"visible","opacity":1});
		},
		vanish:function(){//隐藏pop框
			this.modal.hide();
			this.clearContent();

		},
		clearContent:function(){//清除输入框的内容
			this.inputName.val("");
			this.inputPhone.val("");
			this.inputEmail.val("");
		},
		saveItem:function(){//保存修改的内容
			var nameValue = this.view.cname.val();
			var phoneValue = this.view.cphone.val();
			var emailValue = this.view.cemail.val();

			this.view.model.save({name:nameValue,phone:phoneValue,email:emailValue});
			this.view.cname.hide();
			this.view.cphone.hide();
			this.view.cemail.hide();
		},
		doSearch:function(){
			var value = this.searchArea.val();
			contacts.each(function(todo){
				if(todo.get("name") != value){
					todo.get("el").hide();
				}
			})

		}
	});

	var App = new AppView;
});