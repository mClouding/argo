import {Page, SlidingPanel} from 'argo-ui';
import * as React from 'react';
import {useContext, useEffect, useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {WorkflowEventBinding} from '../../../../models';
import {uiUrl} from '../../../shared/base';
import {ErrorNotice} from '../../../shared/components/error-notice';
import {GraphPanel} from '../../../shared/components/graph/graph-panel';
import {Graph} from '../../../shared/components/graph/types';
import {Loading} from '../../../shared/components/loading';
import {NamespaceFilter} from '../../../shared/components/namespace-filter';
import {ResourceEditor} from '../../../shared/components/resource-editor/resource-editor';
import {ZeroState} from '../../../shared/components/zero-state';
import {Context} from '../../../shared/context';
import {toHistory} from '../../../shared/history';
import {services} from '../../../shared/services';
import {ID} from './id';

export const WorkflowEventBindingsList = (props: RouteComponentProps<any>) => {
    // boiler-plate
    const {match, location, history} = props;
    const ctx = useContext(Context);
    const queryParams = new URLSearchParams(location.search);

    // state for URL and query parameters
    const [namespace, setNamespace] = useState(match.params.namespace);
    const [selectedWorkflowEventBinding, setSelectedWorkflowEventBinding] = useState(queryParams.get('selectedWorkflowEventBinding'));
    useEffect(() => history.push(toHistory('workflow-event-bindings/{namespace}', {namespace, selectedWorkflowEventBinding})), [namespace, selectedWorkflowEventBinding]);

    // internal state
    const [error, setError] = useState<Error>();
    const [workflowEventBindings, setWorkflowEventBindings] = useState<WorkflowEventBinding[]>();

    const selected = (workflowEventBindings || []).find(x => x.metadata.namespace + '/' + x.metadata.name === selectedWorkflowEventBinding);

    const g = new Graph();
    (workflowEventBindings || []).forEach(web => {
        const bindingId = ID.join('WorkflowEventBinding', web.metadata.namespace, web.metadata.name);
        g.nodes.set(bindingId, {label: web.spec.event.selector, type: 'event', icon: 'cloud'});
        if (web.spec.submit) {
            const templateName = web.spec.submit.workflowTemplateRef.name;
            const templateId = ID.join('WorkflowTemplate', web.metadata.namespace, templateName);
            g.nodes.set(templateId, {label: templateName, type: 'template', icon: 'window-maximize'});
            g.edges.set({v: bindingId, w: templateId}, {});
        }
    });

    useEffect(() => {
        services.event
            .listWorkflowEventBindings(namespace)
            .then(list => setWorkflowEventBindings(list.items || []))
            .catch(setError);
    }, [namespace]);

    return (
        <Page
            title='Workflow Event Bindings'
            toolbar={{
                tools: [<NamespaceFilter key='namespace-filter' value={namespace} onChange={setNamespace}/>]
            }}>
            <ErrorNotice error={error}/>
            {!workflowEventBindings ? (
                <Loading/>
            ) : workflowEventBindings.length === 0 ? (
                <ZeroState title='Workflow Event Bindings'>
                    <p>
                        Workflow event bindings allow you to trigger workflows when a webhook event is received. For example, start a build on a Git commit, or start a machine
                        learning pipeline from a remote system.
                    </p>
                    <p>
                        Once you've created a a workflow event binding, you can test it from the CLI using <code>curl</code>, for example:
                    </p>
                    <p>
                        <code>
                            curl '{document.location.protocol}://{document.location.host}/api/v1/events/{namespace}/-' -H 'Content-Type: application/json' -H 'Authorization:
                            $ARGO_TOKEN' -d '&#123;&#125;'
                        </code>
                    </p>
                    <p>
                        You'll probably find it easiest to experiment and test using the <a href={uiUrl('apidocs')}>graphical interface to the API </a> - look for "EventService.
                    </p>
                    <p>
                        <a href='https://argoproj.github.io/argo/events/'>Learn more</a>
                    </p>
                </ZeroState>
            ) : (
                <>
                    <GraphPanel
                        graph={g}
                        types={{event: true, template: true}}
                        classNames={{'': true}}
                        horizontal={true}
                        onNodeSelect={id => {
                            const x = ID.split(id);
                            if (x.type === 'WorkflowTemplate') {
                                ctx.navigation.goto(uiUrl('workflow-templates/' + x.namespace + '/' + x.name));
                            } else {
                                setSelectedWorkflowEventBinding(x.namespace + '/' + x.name);
                            }
                        }}
                    />
                    <SlidingPanel isShown={!!selectedWorkflowEventBinding} onClose={() => setSelectedWorkflowEventBinding(null)}>
                        {selected && <ResourceEditor value={selected}/>}
                    </SlidingPanel>
                </>
            )}
        </Page>
    );
};