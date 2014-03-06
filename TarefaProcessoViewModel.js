/// <reference path="../references.js" />
define([
    'sinatra'
], function (Sinatra) {

    var Process = (function () {
        var _map = function (obj, index) {
            var self = this;

            $.extend(self, obj);

            var _status = Sinatra.AppContext.TranslateStatus(obj.Status || 0)

            self.Element = _map.CreateElement(obj.Id, obj.NomeOrdenado, obj.TemSubtarefas, _status.Color);

            statusLegend(_status);

            self._rendered = $.Deferred();
        };

        function statusLegend(status) {

            if (status.Title != undefined && !_map.SubtitleStatus.some(function (t) { return t.Title === status.Title; })) {
                _map.SubtitleStatus.push(status);
            }
        };

        _map.SubtitleStatus = [{ Title: 'Projeto', Color: 'greenDefault' }];

        _map.HTMLRendered = $("<li>").addClass("map-project");

        _map.EmbedElements = function (elements) {
            $.each(elements, function (key, value) {

                if (key == 0) {
                    _map.HTMLRendered.text(value.NomeDoProjeto);
                    _map.HTMLRendered.append($("<ul>").attr('id', kendo.format("pro-{0}", value.ProjetoId)));
                }

                if (!value.TarefaPaiId) {
                    $(_map.HTMLRendered).find('#pro-' + value.ProjetoId).append(value.Element);
                } else {
                    $(_map.HTMLRendered).find('#pai-' + value.TarefaPaiId).append(value.Element);
                }

                value._rendered.resolve();
            });
        }

        _map.CreateElement = function (id, text, temSubTarefas, status) {

            var statusClass = kendo.format("bg-color-{0}", status);

            var attributes = {
                'data-id': id
            };
            var li = $("<li>").text(text).attr(attributes).addClass(statusClass + ' map-item');
            if (temSubTarefas) {
                li.append($("<ul>").attr('id', kendo.format("pai-{0}", id)));
            }
            return li;
        };

        _map.many = function (array, callback) {
            array = array.map(function (t, index) { return new _map(t, index); });

            var rendered = array.map(function (t) { return t._rendered; });

            _map.EmbedElements(array);

            $.whenAll(rendered).done(function () {
                callback(array[0].NomeDoProjeto, _map.SubtitleStatus, _map.HTMLRendered);
            });

            return array;
        };

        return _map;
    })();

    return function (obj) {
        var projetoInfo = Sinatra.Utils.Details('#/Projeto');
        var ProcessInfo = Sinatra.Utils.Details('#/Process');

        var self = this;

        self.Projeto = ko.observable("Projeto");

        self.MapaDoProcesso = ko.observable();

        self.Legendas = ko.observableArray([]);

        self.Detalhes = (function () {

            var detalhes = {
                Visivel: ko.observable(false),
                Texto: ko.observable(),
                ObterDetalhes: function () {

                    if ($(this).data().id) {
                        var _id = $(this).data().id;
                        var url = '#/Tarefa/DetalhesDoProcesso/';
                        var template = kendo.template($("#tarefaTemplate").html());
                    } else {
                        var _id = projetoInfo.id;
                        var url = '#/Projeto/DetalhesDoProjeto/';
                        var template = kendo.template($("#projetoTemplate").html());
                    }

                    $.get(url, { 'id': _id }).done(function (result) {

                        result.Status = Sinatra.AppContext.TranslateStatus(result.Status || 0).Title;

                        if (result.Dependencias && result.Dependencias.length > 0) {
                            result.Dependencias = result.Dependencias.join('<br/>');
                        } else {
                            result.Dependencias = "-";
                        }

                        result.Prioridade = Sinatra.AppContext.TranslatePriority(result.Prioridade || 0);

                        self.Detalhes.Texto(template(result));
                        self.Detalhes.Visivel(true);
                        $('#detalhes-processo').data("kendoWindow").center();
                    });
                },
                Action: function () {
                    $('.map-item').on('click', detalhes.ObterDetalhes);
                }
            }

            return detalhes;
        })();

        self.Tarefas = ko.observableArray(Process.many(obj, function (projectName, subtitleStatus, _html) {
            self.Projeto(projectName);
            self.Legendas(subtitleStatus);
            return self.MapaDoProcesso($(_html).html());
        }));

        self.Configuracoes = (function () {
            var _config = ko.observable();

            _config.Visivel = ko.observable(false);

            _config.Alternar = function () {
                _config.Visivel(!_config.Visivel());
            };

            _config.TipoDePermissionamento = ko.observable(0);
            _config.Pessoas = ko.observableArray([]);

            return _config;
        })();

        (function Setup() {
            Sinatra.AppContext.Header.Titulo(Sinatra.AppContext.ReduceString(self.Projeto(), 30));

            Sinatra.AppContext.SplitLeft.Visible(false);

            Sinatra.Utils.CentralTabs();
        })();
    }
});