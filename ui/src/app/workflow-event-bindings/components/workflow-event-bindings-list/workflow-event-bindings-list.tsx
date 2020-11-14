import {Page, SlidingPanel} from 'argo-ui';
import * as React from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {WorkflowEventBinding} from '../../../../models';
import {uiUrl} from '../../../shared/base';
import {BasePage} from '../../../shared/components/base-page';
import {ErrorNotice} from '../../../shared/components/error-notice';
import {GraphPanel} from '../../../shared/components/graph/graph-panel';
import {Graph} from '../../../shared/components/graph/types';
import {Loading} from '../../../shared/components/loading';
import {NamespaceFilter} from '../../../shared/components/namespace-filter';
import {Notice} from '../../../shared/components/notice';
import {ResourceEditor} from '../../../shared/components/resource-editor/resource-editor';
import {services} from '../../../shared/services';
import {Utils} from '../../../shared/utils';

interface State {
    namespace: string;
    error?: Error;
    workflowEventBindings?: WorkflowEventBinding[];
    selectedWorkflowEventBinding?: {namespace: string; name: string};
}

type Type = 'WorkflowEventBinding' | 'WorkflowTemplate';

const ID = {
    join: (type: Type, namespace: string, name: string) => type + '/' + namespace + '/' + name,
    split: (id: string) => ({
        type: id.split('/')[0] as Type,
        namespace: id.split('/')[1],
        name: id.split('/')[2]
    })
};

export class WorkflowEventBindingsList extends BasePage<RouteComponentProps<any>, State> {
    private get selectedWorkflowEventBinding(): WorkflowEventBinding {
        if (!this.state.selectedWorkflowEventBinding) {
            return;
        }
        return this.state.workflowEventBindings.find(
            x => x.metadata.namespace === this.state.selectedWorkflowEventBinding.namespace && x.metadata.name === this.state.selectedWorkflowEventBinding.name
        );
    }

    private get namespace() {
        return this.state.namespace;
    }

    private set namespace(namespace: string) {
        this.fetch(namespace);
    }

    private get graph() {
        const g = new Graph();
        this.state.workflowEventBindings.forEach(web => {
            const webId = ID.join('WorkflowEventBinding', web.metadata.namespace, web.metadata.name);
            g.nodes.set(webId, {label: web.spec.event.selector, type: 'event', icon: 'cloud'});
            if (web.spec.submit) {
                const templateName = web.spec.submit.workflowTemplateRef.name;
                const templateId = ID.join('WorkflowTemplate', web.metadata.namespace, templateName);
                g.nodes.set(templateId, {label: templateName, type: 'template', icon: 'window-maximize'});
                g.edges.set({v: webId, w: templateId}, {});
            }
        });

        return g;
    }

    constructor(props: RouteComponentProps<any>, context: any) {
        super(props, context);
        this.state = {namespace: this.props.match.params.namespace || ''};
    }

    public componentDidMount() {
        this.fetch(this.namespace);
    }

    public render() {
        return (
            <Page
                title='Workflow Event Bindings'
                toolbar={{
                    breadcrumbs: [
                        {
                            title: 'Workflow Event Bindings',
                            path: 'workflow-event-bindings/' + this.namespace
                        }
                    ],
                    tools: [<NamespaceFilter key='namespace-filter' value={this.namespace} onChange={namespace => (this.namespace = namespace)} />]
                }}>
                {this.state.error && <ErrorNotice error={this.state.error} />}
                {!this.state.workflowEventBindings ? (
                    <Loading />
                ) : (
                    <>
                        <GraphPanel
                            graph={this.graph}
                            types={{event: true, template: true}}
                            classNames={{'': true}}
                            horizontal={true}
                            onNodeSelect={id => {
                                const {type, namespace, name} = ID.split(id);
                                if (type === 'WorkflowTemplate') {
                                    this.url = uiUrl('workflow-templates/' + namespace + '/' + name);
                                } else {
                                    this.setState({selectedWorkflowEventBinding: {namespace, name}});
                                }
                            }}
                        />
                        <Notice style={{margin: 20}}>
                            <i className='fa fa-info-circle' /> Workflow event bindings allow you to trigger workflows when a webhook event is received. For example, start a build
                            on a Git commit. Use the <a href={uiUrl('apidocs')}>API docs</a> to test. <a href='https://argoproj.github.io/argo/events/'>Learn more</a>
                        </Notice>
                        <SlidingPanel isShown={!!this.selectedWorkflowEventBinding} onClose={() => this.setState({selectedWorkflowEventBinding: null})}>
                            {this.state.selectedWorkflowEventBinding && <ResourceEditor value={this.selectedWorkflowEventBinding} />}
                        </SlidingPanel>
                    </>
                )}
            </Page>
        );
    }

    private saveHistory() {
        this.appContext.router.history.push(uiUrl(`workflow-event-bindings/${this.namespace}`));
        Utils.setCurrentNamespace(this.namespace);
    }

    private fetch(namespace: string) {
        services.event
            .listWorkflowEventBindings(namespace)
            .then(list =>
                this.setState(
                    {
                        workflowEventBindings: list.items || [],
                        namespace,
                        error: null
                    },
                    () => this.saveHistory()
                )
            )
            .catch(error => this.setState({error}));
    }
}