/// <reference path="../references.js" />
define([
    'sinatra'
], function (Sinatra) {

    var Tarefa = (function () {
        var _tarefa = function (obj, index) {
            var self = this;

            $.extend(self, obj);

            // 03. Parâmetros de estilo dos elementos do modelo
            self.Parameters = (function () {

                var params = ko.observable();

                params.Width = 150;
                params.Height = 40;
                params.Margin = 20;
                params.Padding = 15;
                params.Border = {
                    borderColor: '#000',
                    borderWidth: 2,
                    borderStyle: 'solid'
                };
                params.Measure = function () {
                    return params.Margin + params.Padding + params.Width;
                };
                params.Top = function () {
                    var lvl = !self.Ancestrais ? 1 : self.Ancestrais.length;
                    return lvl * (this.Margin * 2) * 5;
                };
                params.Left = function () {
                    var lvl = !self.TemSubtarefas ? 0 : self.Subtarefas.length;
                    return ((this.Margin * 2) + this.Width) * (index) /*+ ((params.Measure() * lvl / 2) + (this.Width / 2))*/;
                };

                return {
                    padding: params.Padding,
                    border: kendo.format("{0} {1}px {2}", params.Border.borderColor, params.Border.borderWidth, params.Border.borderStyle),
                    width: params.Width,
                    margin: params.Margin,
                    top: params.Top(),
                    left: params.Left(),
                    measure: params.Measure
                };

            })();

            self._rendered = $.Deferred();
        };

        // 07. Parametrização do componente e conexão dos elementos
        _tarefa.MapPlumb = function (element, target) {
            jsPlumb.connect({
                source: element,
                target: target,
                endpoint: 'Blank',
                anchors: ['BottomCenter', 'TopCenter'],
                connector: ['Flowchart', { cornerRadius: 5 }],
                paintStyle: { strokeStyle: '#000', lineWidth: 2 },
                container: $("#tarefa-mapa")
            });
        }

        _tarefa.Rendered = [];

        _tarefa.PositionElements = function (element, list) {
            $.each(list, function (key, value) {

                if (value.TarefaPaiId) {
                    element = $('#' + value.TarefaPaiId);
                }

                var target = $('#' + value.Id);

                var cssToTargetMap = {};

                // 06.4. Ajustar posicionamento dos elementos das Tarefas
                for (var index in value.Parameters) {
                    if (value.Parameters.hasOwnProperty(index) && typeof value.Parameters[index] !== "function") {
                        cssToTargetMap[index] = value.Parameters[index];
                    }
                }

                target.css(cssToTargetMap);

                // 06.5. Estabelecer conexões entre os elementos
                _tarefa.MapPlumb(element, target);

            });
        };

        _tarefa.many = function (array, callback) {
            // 02. Mapear os dados obtidos
            array = array.map(function (t, index) { return new _tarefa(t, index); });

            var rendered = array.map(function (t) { return t._rendered; });

            // 06. Quando todos os elementos estiverem renderizados, seguir em frente com a execução
            $.whenAll(rendered).done(function (dataRendered) {
                var element = $("#map-source");
                // 06.1. Atualizar o nome do Projeto
                callback(dataRendered[0].NomeDoProjeto);

                var offset = { marginLeft: 0 };

                // 06.2. Recalcular a margem esquerda do elemento do Projeto.
                //       MarginLeft = (MeioDasTarefas[SomaDaLarguraDeTodasAsTarefa / 2]) - (MeioDoProjeto[LarguraDoProjeto / 2])
                offset.marginLeft = dataRendered.map(function (t) {
                    return t.Parameters.measure();
                }).reduce(function (previousValue, currentValue, index, array) {
                    return previousValue + currentValue;
                }) / 2 - (element.outerWidth() / 2);
                element.css(offset);

                // 06.3. Iterar nos elementos das Tarefas para adiocioná-los as conexões
                _tarefa.PositionElements(element, dataRendered);
            });

            return array;
        };

        return _tarefa;
    })();

    return function (obj) {
        var projetoInfo = Sinatra.Utils.Details('#/Projeto');
        var tarefaInfo = Sinatra.Utils.Details('#/Tarefa');

        var self = this;

        // 04. Gatilho de controle de renderização
        self.IsRendered = function () {
            var item = arguments[1];

            // 05. Adicionar itens renderizados para ajustá-los o posicionamento
            Tarefa.Rendered.push(item);
            item._rendered.resolve(Tarefa.Rendered);
        }

        self.Projeto = ko.observable("Projeto");

        // 01. Obter array de tarefas e aplicar modelo de Tarefa
        self.Tarefas = ko.observableArray(Tarefa.many(obj, function (title) {
            return self.Projeto(title);
        }));

        (function Setup() {
            Sinatra.AppContext.Header.Titulo(self.Projeto());

            Sinatra.Utils.CentralTabs();
        })();

    }
});