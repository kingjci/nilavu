import { flushMap } from 'nilavu/models/store';
import RestModel from 'nilavu/models/rest';
import { propertyEqual } from 'nilavu/lib/computed';
import { longDate } from 'nilavu/lib/formatter';
import computed from 'ember-addons/ember-computed-decorators';

export function loadTopicView(topic, args) {
  const topicId = topic.get('id');

  const data = _.merge({}, args);

  const url = Nilavu.getURL("/t/") + topicId;

  const jsonUrl = (data.nearPost ? `${url}/${data.nearPost}` : url) + '.json';

  delete data.nearPost;
  delete data.__type;
  delete data.store;

  return PreloadStore.getAndRemove(`topic_${topicId}`, () => {
      return Nilavu.ajax(jsonUrl, {data});
  }).then(json => {
    topic.updateFromJson(json);
    return json;
  });
}

const Topic = RestModel.extend({
  message: null,
  errorLoading: false,
  privatekey_url: null,
  publickey_url: null,

  url: function() {
    let slug = this.get('slug') || '';
    if (slug.trim().length === 0) {
      slug = "topic";
    }
    return Nilavu.getURL("/t/")  + (this.get('id'));
  }.property('id', 'slug'),

    // returns createdAt if there's no bumped date
  bumpedAt: function() {
    const bumpedAt = this.get('bumped_at');
    if (bumpedAt) {
      return new Date(bumpedAt);
    } else {
      return this.get('createdAt');
    }
  }.property('bumped_at', 'createdAt'),

  bumpedAtTitle: function() {
    return I18n.t('first_post') + ": " + longDate(this.get('createdAt')) + "\n" +
           I18n.t('last_post') + ": " + longDate(this.get('bumpedAt'));
  }.property('bumpedAt'),

  fullName: function() {
    var js = this._filterInputs("domain");
    return this.get('name')+"."+js;
  }.property(),

  domain: function() {
    return this._filterInputs("domain");
  }.property(),

  cpu_cores: function() {
    return this._filterInputs("cpu");
  }.property(),

  ram: function() {
    return this._filterInputs("ram");
  }.property(),

  hdd: function() {
    return this._filterInputs("hdd");
  }.property(),

  host: function() {
    return this._filterOutputs("host");
  }.property(),

  region: function() {
    return this._filterOutputs("region");
  }.property(),

  sshkey_name: function() {
    return this._filterInputs("sshkey");
  }.property(),

  privateIP: function() {
    return this._filterInputs("privateipv4");
  }.property(),

  publicIP: function() {
    return this._filterInputs("publicipv4");
  }.property(),

  privatekey: function() {
    return this._filterInputs("sshkey") + "_key";
  }.property(),

  public_sshkey: function() {
    return this._filterInputs("sshkey") + "_pub";
  }.property(),

  _filterInputs(key) {
    return this.get('inputs').filterBy('key', key)[0].value;
  },

  _filterOutputs(key) {
    return this.get('outputs').filterBy('key', key)[0].value;
  },

  asmsid: function() {
    return this.get('asms_id');
  }.property('asms_id'),

  createdAt: function() {
    return new Date(this.get('created_at'));
  }.property('created_at'),

  status: function() {
    return this.get('status');
  }.property('status'),

  /*privatekey_generate_url() {
    const self = this;
    return Nilavu.ajax("/sshkeys/'+this.private_sshkey+'/edit",  { type: 'GET' })
                  .then(function (url) { self.set('privatekey_download_url', 'url'); });
  },*/

  privatekey_download(key) {
    alert(key);
    this.privatekey_generate_url(key).then(function(url) {
      alert(url);
        //Em.run.next(() => { NilavuURL.routeTo(url); });
      }).catch(function() {
        //self.flash(I18n.t('topic.change_timestamp.error'), 'alert-error');
        //self.set('saving', false);
        alert("error");
      });
  },

  privatekey_generate_url(key) {
    const promise = Nilavu.ajax("/ssh_keys/edit/"+key, {
      type: 'GET',
    }).then(function(result) {
      if (result.success) return result;
      promise.reject(new Error("error generating privatekey download url"));
    });
    return promise;
  },

  publickey_generate_url() {
    const self = this;
    return Nilavu.ajax("/sshkeys/'+this.public_sshkey+'/edit",  { type: 'GET' })
                  .then(function (url) { self.set('publickey_download_url', 'url'); });
  },

  invisible: Em.computed.not('visible'),
  deleted: Em.computed.notEmpty('deleted_at'),

  searchContext: function() {
    return ({ type: 'topic', id: this.get('id') });
  }.property('id'),

  _categoryIdChanged: function() {
    this.set('category', Nilavu.Category.findById(this.get('category_id')));
  }.observes('category_id').on('init'),

  _categoryNameChanged: function() {
    const categoryName = this.get('categoryName');
    let category;
    if (categoryName) {
      category = Nilavu.Category.list().findProperty('name', categoryName);
    }
    this.set('category', category);
  }.observes('categoryName'),

  categoryClass: function() {
    return 'category-' + this.get('category.fullSlug');
  }.property('category.fullSlug'),

  shareUrl: function(){
    const user = Nilavu.User.current();
    return this.get('url') + (user ? '?u=' + user.get('username_lower') : '');
  }.property('url'),

  url: function() {
    let slug = this.get('slug') || '';
    if (slug.trim().length === 0) {
      slug = "topic";
    }
    return Nilavu.getURL("/t/") + slug + "/" + (this.get('id'));
  }.property('id', 'slug'),

  // Helper to build a Url with a post number
  urlForPostNumber(postNumber) {
    let url = this.get('url');
    if (postNumber && (postNumber > 0)) {
      url += "/" + postNumber;
    }
    return url;
  },

  totalUnread: function() {
    const count = (this.get('unread') || 0) + (this.get('new_posts') || 0);
    return count > 0 ? count : null;
  }.property('new_posts', 'unread'),

  lastReadUrl: function() {
    return this.urlForPostNumber(this.get('last_read_post_number'));
  }.property('url', 'last_read_post_number'),

  lastUnreadUrl: function() {
    const postNumber = Math.min(this.get('last_read_post_number') + 1, this.get('highest_post_number'));
    return this.urlForPostNumber(postNumber);
  }.property('url', 'last_read_post_number', 'highest_post_number'),

  lastPostUrl: function() {
    return this.urlForPostNumber(this.get('highest_post_number'));
  }.property('url', 'highest_post_number'),

  firstPostUrl: function () {
    return this.urlForPostNumber(1);
  }.property('url'),

  summaryUrl: function () {
    return this.urlForPostNumber(1) + (this.get('has_summary') ? "?filter=summary" : "");
  }.property('url'),

  lastPosterUrl: function() {
    return Nilavu.getURL("/users/") + this.get("last_poster.username");
  }.property('last_poster'),

  // The amount of new posts to display. It might be different than what the server
  // tells us if we are still asynchronously flushing our "recently read" data.
  // So take what the browser has seen into consideration.
  displayNewPosts: function() {
    const highestSeen = Nilavu.Session.currentProp('highestSeenByTopic')[this.get('id')];
    if (highestSeen) {
      let delta = highestSeen - this.get('last_read_post_number');
      if (delta > 0) {
        let result = this.get('new_posts') - delta;
        if (result < 0) {
          result = 0;
        }
        return result;
      }
    }
    return this.get('new_posts');
  }.property('new_posts', 'id'),

  viewsHeat: function() {
    const v = this.get('views');
    if( v >= Nilavu.SiteSettings.topic_views_heat_high )   return 'heatmap-high';
    if( v >= Nilavu.SiteSettings.topic_views_heat_medium ) return 'heatmap-med';
    if( v >= Nilavu.SiteSettings.topic_views_heat_low )    return 'heatmap-low';
    return null;
  }.property('views'),

  archetypeObject: function() {
    return Nilavu.Site.currentProp('archetypes').findProperty('id', this.get('archetype'));
  }.property('archetype'),

  isPrivateMessage: Em.computed.equal('archetype', 'private_message'),
  isBanner: Em.computed.equal('archetype', 'banner'),

  toggleStatus(property) {
    this.toggleProperty(property);
    this.saveStatus(property, !!this.get(property));
  },

  saveStatus(property, value, until) {
    if (property === 'closed') {
      this.incrementProperty('posts_count');

      if (value === true) {
        this.set('details.auto_close_at', null);
      }
    }
    return Nilavu.ajax(this.get('url') + "/status", {
      type: 'PUT',
      data: {
        status: property,
        enabled: !!value,
        until: until
      }
    });
  },

  makeBanner() {
    const self = this;
    return Nilavu.ajax('/t/' + this.get('id') + '/make-banner', { type: 'PUT' })
           .then(function () { self.set('archetype', 'banner'); });
  },

  removeBanner() {
    const self = this;
    return Nilavu.ajax('/t/' + this.get('id') + '/remove-banner', { type: 'PUT' })
           .then(function () { self.set('archetype', 'regular'); });
  },

  toggleBookmark() {
    if (this.get('bookmarking')) { return Ember.RSVP.Promise.resolve(); }
    this.set("bookmarking", true);

    const stream = this.get('postStream');
    const posts = Em.get(stream, 'posts');
    const firstPost = posts && posts[0] && posts[0].get('post_number') === 1 && posts[0];
    const bookmark = !this.get('bookmarked');
    const path = bookmark ? '/bookmark' : '/remove_bookmarks';

    const toggleBookmarkOnServer = () => {
      return Nilavu.ajax(`/t/${this.get('id')}${path}`, { type: 'PUT' }).then(() => {
        this.toggleProperty('bookmarked');
        if (bookmark && firstPost) {
          firstPost.set('bookmarked', true);
          return [firstPost.id];
        }
        if (!bookmark && posts) {

          const updated = [];
          posts.forEach(post => {
            if (post.get('bookmarked')) {
              post.set('bookmarked', false);
              updated.push(post.get('id'));
            }
          });
          return updated;
        }

        return [];
      }).catch(error => {
        let showGenericError = true;
        if (error && error.responseText) {
          try {
            bootbox.alert($.parseJSON(error.responseText).errors);
            showGenericError = false;
          } catch(e) { }
        }

        if (showGenericError) {
          bootbox.alert(I18n.t('generic_error'));
        }

        throw error;
      }).finally(() => this.set('bookmarking', false));
    };

    const unbookmarkedPosts = [];
    if (!bookmark && posts) {
      posts.forEach(post => post.get('bookmarked') && unbookmarkedPosts.push(post));
    }

    return new Ember.RSVP.Promise(resolve => {
      if (unbookmarkedPosts.length > 1) {
        bootbox.confirm(
          I18n.t("bookmarks.confirm_clear"),
          I18n.t("no_value"),
          I18n.t("yes_value"),
          confirmed => confirmed ? toggleBookmarkOnServer().then(resolve) : resolve()
        );
      } else {
        toggleBookmarkOnServer().then(resolve);
      }
    });
  },

  createInvite(emailOrUsername, groupNames) {
    return Nilavu.ajax("/t/" + this.get('id') + "/invite", {
      type: 'POST',
      data: { user: emailOrUsername, group_names: groupNames }
    });
  },

  generateInviteLink: function(email, groupNames, topicId) {
    return Nilavu.ajax('/invites/link', {
      type: 'POST',
      data: {email: email, group_names: groupNames, topic_id: topicId}
    });
  },

  // Delete this topic
  destroy(deleted_by) {
    this.setProperties({
      deleted_at: new Date(),
      deleted_by: deleted_by,
      'details.can_delete': false,
      'details.can_recover': true
    });
    return Nilavu.ajax("/t/" + this.get('id'), {
      data: { context: window.location.pathname },
      type: 'DELETE'
    });
  },

  // Recover this topic if deleted
  recover() {
    this.setProperties({
      deleted_at: null,
      deleted_by: null,
      'details.can_delete': true,
      'details.can_recover': false
    });
    return Nilavu.ajax("/t/" + this.get('id') + "/recover", { type: 'PUT' });
  },

  // Update our attributes from a JSON result
  updateFromJson(json) {
    this.get('details').updateFromJson(json.details);

    const keys = Object.keys(json);
    keys.removeObject('details');
    keys.removeObject('post_stream');

    keys.forEach(key => this.set(key, json[key]));
  },

  reload() {
    alert("Reload topic");
    const self = this;
    return Nilavu.ajax('/t/' + this.get('id'), { type: 'GET' }).then(function(topic_json) {
      self.updateFromJson(topic_json);
    });
  },

  isPinnedUncategorized: function() {
    return this.get('pinned') && this.get('category.isUncategorizedCategory');
  }.property('pinned', 'category.isUncategorizedCategory'),

  clearPin() {
    const topic = this;

    // Clear the pin optimistically from the object
    topic.set('pinned', false);
    topic.set('unpinned', true);

    Nilavu.ajax("/t/" + this.get('id') + "/clear-pin", {
      type: 'PUT'
    }).then(null, function() {
      // On error, put the pin back
      topic.set('pinned', true);
      topic.set('unpinned', false);
    });
  },

  togglePinnedForUser() {
    if (this.get('pinned')) {
      this.clearPin();
    } else {
      this.rePin();
    }
  },

  rePin() {
    const topic = this;

    // Clear the pin optimistically from the object
    topic.set('pinned', true);
    topic.set('unpinned', false);

    Nilavu.ajax("/t/" + this.get('id') + "/re-pin", {
      type: 'PUT'
    }).then(null, function() {
      // On error, put the pin back
      topic.set('pinned', true);
      topic.set('unpinned', false);
    });
  },


  hasExcerpt: Em.computed.notEmpty('excerpt'),

  excerptTruncated: function() {
    const e = this.get('excerpt');
    return( e && e.substr(e.length - 8,8) === '&hellip;' );
  }.property('excerpt'),

  readLastPost: propertyEqual('last_read_post_number', 'highest_post_number'),
  canClearPin: Em.computed.and('pinned', 'readLastPost'),

  archiveMessage() {
    this.set("archiving", true);
    var promise = Nilavu.ajax(`/t/${this.get('id')}/archive-message`, {type: 'PUT'});

    promise.then((msg)=> {
      this.set('message_archived', true);
      if (msg && msg.group_name) {
        this.set('inboxGroupName', msg.group_name);
      }
    }).finally(()=>this.set('archiving', false));

    return promise;
  },

  moveToInbox() {
    this.set("archiving", true);
    var promise = Nilavu.ajax(`/t/${this.get('id')}/move-to-inbox`, {type: 'PUT'});

    promise.then((msg)=> {
      this.set('message_archived', false);
      if (msg && msg.group_name) {
        this.set('inboxGroupName', msg.group_name);
      }
    }).finally(()=>this.set('archiving', false));

    return promise;
  }

});

Topic.reopenClass({
  NotificationLevel: {
    WATCHING: 3,
    TRACKING: 2,
    REGULAR: 1,
    MUTED: 0
  },

  createActionSummary(result) {
    if (result.actions_summary) {
      const lookup = Em.Object.create();
      result.actions_summary = result.actions_summary.map(function(a) {
        a.post = result;
        a.actionType = Nilavu.Site.current().postActionTypeById(a.id);
        /*const actionSummary = ActionSummary.create(a);
        lookup.set(a.actionType.get('name_key'), actionSummary);
        return actionSummary;*/
        return "ACTIONSUMMRY";
      });
      result.set('actionByName', lookup);
    }
  },

  update(topic, props) {
    props = JSON.parse(JSON.stringify(props)) || {};

    // We support `category_id` and `categoryId` for compatibility
    if (typeof props.categoryId !== "undefined") {
      props.category_id = props.categoryId;
      delete props.categoryId;
    }

    // Make sure we never change the category for private messages
    if (topic.get("isPrivateMessage")) { delete props.category_id; }

    // Annoyingly, empty arrays are not sent across the wire. This
    // allows us to make a distinction between arrays that were not
    // sent and arrays that we specifically want to be empty.
    Object.keys(props).forEach(function(k) {
      const v = props[k];
      if (v instanceof Array && v.length === 0) {
        props[k + '_empty_array'] = true;
      }
    });

    return Nilavu.ajax(topic.get('url'), { type: 'PUT', data: props }).then(function(result) {
      // The title can be cleaned up server side
      props.title = result.basic_topic.title;
      props.fancy_title = result.basic_topic.fancy_title;
      topic.setProperties(props);
    });
  },

  create() {
    const result = this._super.apply(this, arguments);
    //    this.createActionSummary(result);
    return result;
  },

  // Load a topic, but accepts a set of filters
  find(topicId, opts) {
    let url = Nilavu.getURL("/t/") + topicId;
    if (opts.nearPost) {
      url += "/" + opts.nearPost;
    }

    const data = {};
    if (opts.postsAfter) {
      data.posts_after = opts.postsAfter;
    }
    if (opts.postsBefore) {
      data.posts_before = opts.postsBefore;
    }
    if (opts.trackVisit) {
      data.track_visit = true;
    }

    // Add username filters if we have them
    if (opts.userFilters && opts.userFilters.length > 0) {
      data.username_filters = [];
      opts.userFilters.forEach(function(username) {
        data.username_filters.push(username);
      });
      data.show_deleted = true;
    }

    // Add the summary of filter if we have it
    if (opts.summary === true) {
      data.summary = true;
    }

    // Check the preload store. If not, load it via JSON
    return Nilavu.ajax(url + ".json", {data: data});
  },

  changeOwners(topicId, opts) {
    const promise = Nilavu.ajax("/t/" + topicId + "/change-owner", {
      type: 'POST',
      data: opts
    }).then(function (result) {
      if (result.success) return result;
      promise.reject(new Error("error changing ownership of posts"));
    });
    return promise;
  },

  changeTimestamp(topicId, timestamp) {
    const promise = Nilavu.ajax("/t/" + topicId + '/change-timestamp', {
      type: 'PUT',
      data: { timestamp: timestamp },
    }).then(function(result) {
      if (result.success) return result;
      promise.reject(new Error("error updating timestamp of topic"));
    });
    return promise;
  },

  bulkOperation(topics, operation) {
    return Nilavu.ajax("/topics/bulk", {
      type: 'PUT',
      data: {
        topic_ids: topics.map(function(t) { return t.get('id'); }),
        operation: operation
      }
    });
  },

  bulkOperationByFilter(filter, operation, categoryId) {
    const data = { filter: filter, operation: operation };
    if (categoryId) data['category_id'] = categoryId;
    return Nilavu.ajax("/topics/bulk", {
      type: 'PUT',
      data: data
    });
  },

  resetNew() {
    return Nilavu.ajax("/topics/reset-new", {type: 'PUT'});
  },

  idForSlug(slug) {
    return Nilavu.ajax("/t/id_for/" + slug);
  }
});

function moveResult(result) {
  if (result.success) {
    // We should be hesitant to flush the map but moving ids is one rare case
    flushMap();
    return result;
  }
  throw "error moving posts topic";
}

export function movePosts(topicId, data) {
  return Nilavu.ajax("/t/" + topicId + "/move-posts", { type: 'POST', data }).then(moveResult);
}

export function mergeTopic(topicId, destinationTopicId) {
  return Nilavu.ajax("/t/" + topicId + "/merge-topic", {
    type: 'POST',
    data: {destination_topic_id: destinationTopicId}
  }).then(moveResult);
}

export default Topic;
