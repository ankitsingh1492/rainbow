/* eslint-disable sort-keys */
/* eslint-disable react-native/no-unused-styles */
// eslint-disable-next-line import/extensions
import emoji from 'emoji-datasource';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import 'string.fromcodepoint';
import EmojiTabBarShadow from '../../assets/emojiTabBarShadow.png';
import { colors, position } from '../../styles';
import TabBar from './TabBar';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider,
} from 'recyclerlistview';
import StickyContainer from 'recyclerlistview/dist/reactnative/core/StickyContainer';
import { deviceUtils } from '../../utils';
import {
  State,
  PanGestureHandler,
  TapGestureHandler,
  ScrollView,
} from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import Animated from 'react-native-reanimated';

// TODO width attribute is temporary solution that will be removed as soon as I figure out why proper scaling does not work

export const Categories = {
  people: {
    icon: 'emojiSmileys',
    index: 0,
    name: 'Smileys & People',
    width: 134,
  },
  nature: {
    icon: 'emojiAnimals',
    index: 1,
    name: 'Animals & Nature',
    width: 138,
  },
  food: {
    icon: 'emojiFood',
    index: 2,
    name: 'Food & Drink',
    width: 106,
  },
  activities: {
    icon: 'emojiActivities',
    index: 3,
    name: 'Activities',
    width: 85,
  },
  places: {
    icon: 'emojiTravel',
    index: 4,
    name: 'Travel & Places',
    width: 126,
  },
  objects: {
    icon: 'emojiObjects',
    index: 5,
    name: 'Objects',
    width: 74,
  },
  icons: {
    icon: 'emojiSymbols',
    index: 6,
    name: 'Symbols',
    width: 77,
  },
  flags: {
    icon: 'emojiFlags',
    index: 7,
    name: 'Flags',
    width: 58,
  },
};

const charFromUtf16 = utf16 =>
  String.fromCodePoint(...utf16.split('-').map(u => '0x' + u));
export const charFromEmojiObject = obj => charFromUtf16(obj.unified);
const filteredEmojis = emoji.filter(e => !e['obsoleted_by']);
const emojiByCategory = category =>
  filteredEmojis.filter(e => e.category === category);
const sortEmoji = list => list.sort((a, b) => a.sort_order - b.sort_order);
const { width } = Dimensions.get('screen');
const categoryKeys = Object.keys(Categories);

const EMOJI_CONTAINER = 1;
const HEADER_ROW = 2;
const OVERLAY = 3;

let currentIndex = 0;
let scrollPosition = new Animated.Value(0);
let nextCategoryOffset = new Animated.Value(1);
let blockCategories = true;

export default class EmojiSelector extends PureComponent {
  constructor(args) {
    super(args);

    this.state = {
      allEmojiList: [],
      category: Categories.people,
      colSize: 0,
      emojiList: [],
      history: [],
      isReady: false,
      searchQuery: '',
    };

    nextCategoryOffset = new Animated.Value(1);
    this.contacts = {};

    this._layoutProvider = new LayoutProvider(
      i => {
        if (i === 0 || i === this.state.allEmojiList.length - 1) {
          return OVERLAY;
        }
        if (i % 2 === 0) {
          return EMOJI_CONTAINER;
        }
        return HEADER_ROW;
      },
      (type, dim, i) => {
        if (type === EMOJI_CONTAINER) {
          dim.height =
            Math.floor(this.state.allEmojiList[i].data.length / 7 + 1) *
            ((width - 21) / this.props.columns);
          dim.width = deviceUtils.dimensions.width;
        } else if (type === HEADER_ROW) {
          dim.height = 35;
          dim.width = deviceUtils.dimensions.width;
        } else if (type === OVERLAY) {
          dim.height = i === 0 ? 0.1 : 100;
          dim.width = deviceUtils.dimensions.width;
        } else {
          dim.height = 0;
          dim.width = 0;
        }
      }
    );
  }

  componentDidMount() {
    this.loadEmojis();
    setTimeout(() => {
      this.setState({ isReady: true });
    }, 1000);
  }

  handleTabSelect = category => {
    blockCategories = true;
    this.scrollToOffset(
      category.index * 2 - 1 > 0
        ? this.state.allEmojiList[category.index * 2].offset
        : 0,
      true
    );
    currentIndex = category.index;
    this.setState({
      category,
      searchQuery: '',
    });
  };

  handleEmojiSelect = emoji => {
    this.props.onEmojiSelected(charFromEmojiObject(emoji));
  };

  renderEmojis({ data }) {
    let categoryEmojis = [];
    for (let i = 0; i < data.length; i += this.props.columns) {
      let rowContent = [];
      let touchableNet = [];
      for (let j = 0; j < this.props.columns; j++) {
        if (i + j < data.length) {
          rowContent.push(charFromEmojiObject(data[i + j].emoji));
          touchableNet.push(data[i + j].emoji);
        }
      }
      categoryEmojis.push({
        rowContent,
        touchableNet,
      });
    }
    return (
      <View>
        {categoryEmojis.map(({ rowContent, touchableNet }, categoryIndex) => (
          <View key={`categoryEmoji${categoryIndex}`}>
            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 10,
              }}
            >
              <Text
                style={{
                  fontSize: Math.floor(this.state.colSize) - 15,
                  height: (width - 21) / this.props.columns,
                  width: deviceUtils.dimensions.width,
                  letterSpacing: 8,
                  backgroundColor: colors.white,
                }}
              >
                {rowContent}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                marginHorizontal: 10,
                position: 'absolute',
              }}
            >
              {touchableNet.map((singleLine, index) => (
                <TouchableOpacity
                  key={`categoryEmojiTouchableOpacity${categoryIndex}${index}`}
                  activeOpacity={0.5}
                  style={{
                    height: (width - 21) / this.props.columns,
                    width: (width - 21) / this.props.columns,
                    opacity: 0,
                    backgroundColor: 'white',
                  }}
                  onPress={() => this.handleEmojiSelect(singleLine)}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  renderListHeader = title => {
    return (
      this.props.showSectionTitles && (
        <Animated.View
          style={[styles.sectionHeaderWrap, { opacity: nextCategoryOffset }]}
        >
          <Text style={styles.sectionHeader}>{title}</Text>
        </Animated.View>
      )
    );
  };

  loadEmojis() {
    let allEmojiList = [{ overlay: true }];
    let offset = 0;
    let keys = categoryKeys;
    keys.map(category => {
      const emojiCategory = [
        { header: true, title: Categories[category].name },
        {
          data: sortEmoji(emojiByCategory(Categories[category].name)).map(
            emoji => ({
              emoji,
              key: emoji.unified,
            })
          ),
          emoji: true,
        },
      ];
      if (emojiCategory[1].data.length > 0) {
        const height =
          Math.floor(emojiCategory[1].data.length / 7 + 1) *
          ((width - 21) / this.props.columns);
        emojiCategory[1].height = height;
        offset += height + 35;
        emojiCategory[1].offset = offset;
        allEmojiList = allEmojiList.concat(emojiCategory);
      }
    });

    allEmojiList.push({ overlay: true });

    this.setState({
      allEmojiList,
      colSize: width / this.props.columns,
    });
  }

  hasRowChanged = () => {
    return false;
  };

  renderItem = (type, item, index) => {
    if (type === HEADER_ROW) {
      return this.renderListHeader(item.title);
    } else if (type === OVERLAY) {
      return (
        <View
          style={{
            top: index === 0 && -300,
            bottom: index !== 0 && -300,
            height: 400,
            width: width,
            backgroundColor: colors.white,
            position: 'absolute',
          }}
        />
      );
    }
    return this.renderEmojis(item);
  };

  renderStickyItem = (type, item, index) => (
    <View style={styles.sectionStickyHeaderWrap}>
      <Animated.View
        style={{
          opacity: scrollPosition,
        }}
      >
        <BlurView
          blurType="light"
          blurAmount={10}
          style={[
            styles.sectionStickyBlur,
            { width: Categories[categoryKeys[(index - 1) / 2]].width },
          ]}
        >
          <Text style={styles.sectionStickyHeader}>{item.title}</Text>
        </BlurView>
      </Animated.View>
    </View>
  );

  handleScroll = (event, offsetX, offsetY) => {
    if (!blockCategories) {
      if (
        offsetY - 0.5 >
          this.state.allEmojiList[(currentIndex + 1) * 2].offset &&
        currentIndex < this.state.allEmojiList.length / 2 - 2
      ) {
        currentIndex += 1;
        this.setState({ category: Categories[categoryKeys[currentIndex]] });
      } else if (
        currentIndex * 2 - 1 > 0 &&
        offsetY - 0.5 < this.state.allEmojiList[currentIndex * 2].offset
      ) {
        currentIndex -= 1;
        this.setState({ category: Categories[categoryKeys[currentIndex]] });
      }
      scrollPosition.setValue(
        -offsetY + this.state.allEmojiList[(currentIndex + 1) * 2].offset > 40
          ? 1
          : (-offsetY +
              this.state.allEmojiList[(currentIndex + 1) * 2].offset) /
              40
      );
      nextCategoryOffset.setValue(
        -offsetY + this.state.allEmojiList[(currentIndex + 1) * 2].offset <
          400 || offsetY < 1
          ? 1
          : 0
      );
    }
  };

  scrollToOffset = (position, animated) => {
    this.rlv.scrollToOffset(0, position, animated);
  };

  handleListRef = ref => {
    this.rlv = ref;
  };

  onTapChange = ({ nativeEvent: { state } }) => {
    if (state === State.BEGAN) {
      blockCategories = false;
    }
  };

  panRef = React.createRef();
  svRef = React.createRef();

  render() {
    const {
      theme,
      placeholder,
      showSearchBar,
      showTabs,
      ...other
    } = this.props;

    const { category, isReady, searchQuery } = this.state;

    const Searchbar = (
      <View style={styles.searchbar_container}>
        <TextInput
          style={styles.search}
          placeholder={placeholder}
          clearButtonMode="always"
          returnKeyType="done"
          autoCorrect={false}
          underlineColorAndroid={theme}
          value={searchQuery}
          onChangeText={this.handleSearch}
        />
      </View>
    );

    const prerenderEmoji = [];
    if (this.state.allEmojiList[2]) {
      for (let i = 0; i < 70; i += 7) {
        let emojis = [];
        for (let j = 0; j < 7; j++) {
          emojis.push(
            charFromEmojiObject(this.state.allEmojiList[2].data[i + j].emoji)
          );
        }
        prerenderEmoji.push(
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: 10,
            }}
          >
            <Text
              style={{
                fontSize: Math.floor(this.state.colSize) - 15,
                height: (width - 21) / this.props.columns,
                width: deviceUtils.dimensions.width,
                letterSpacing: 8,
                top: 0.8,
              }}
            >
              {emojis}
            </Text>
          </View>
        );
      }
    }

    return (
      <View style={styles.frame} {...other}>
        <TapGestureHandler onHandlerStateChange={this.onTapChange}>
          <View
            style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}
          >
            {showSearchBar ? Searchbar : null}
            {!isReady ? (
              <View style={styles.loader} {...other}>
                <View style={styles.sectionHeaderWrap}>
                  <Text style={styles.sectionHeader}>Smileys & People</Text>
                </View>
                {prerenderEmoji}
              </View>
            ) : null}
            <PanGestureHandler
              ref={this.panRef}
              simultaneousHandlers={this.svRef}
              activeOffsetY={[-5, 5]}
            >
              <View style={styles.container}>
                <StickyContainer
                  stickyHeaderIndices={[1, 3, 5, 7, 9, 11, 13, 15, 17]}
                  overrideRowRenderer={this.renderStickyItem}
                >
                  <RecyclerListView
                    dataProvider={new DataProvider(
                      this.hasRowChanged
                    ).cloneWithRows(this.state.allEmojiList)}
                    layoutProvider={this._layoutProvider}
                    rowRenderer={this.renderItem}
                    style={{ width: deviceUtils.dimensions.width }}
                    renderAheadOffset={10000}
                    onScroll={this.handleScroll}
                    ref={this.handleListRef}
                    scrollViewProps={{
                      simultaneousHandlers: this.panRef,
                      ref: this.svRef,
                    }}
                    externalScrollView={ScrollView}
                  />
                </StickyContainer>
              </View>
            </PanGestureHandler>
          </View>
        </TapGestureHandler>
        {showTabs ? (
          <View style={styles.tabBar}>
            <Image
              opacity={0.6}
              pointerEvents="none"
              source={EmojiTabBarShadow}
              style={{
                height: 138,
                left: -50.5,
                position: 'absolute',
                top: -46,
                width: 377,
              }}
            />
            <View
              shadowColor={colors.black}
              shadowOffset={{ height: 0, width: 0 }}
              shadowOpacity={0.06}
              shadowRadius={0.5}
              style={position.coverAsObject}
            >
              <LinearGradient
                borderRadius={17}
                overflow="hidden"
                colors={['#FFFFFF', '#FFFFFF', '#F0F5FA']}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
                start={{ x: 0.5, y: 0 }}
                style={position.coverAsObject}
              />
            </View>
            <TabBar
              activeCategory={category}
              onPress={this.handleTabSelect}
              theme={theme}
              categoryKeys={categoryKeys}
            />
          </View>
        ) : null}
      </View>
    );
  }
}

EmojiSelector.propTypes = {
  /** Function called when a user selects an Emoji */
  onEmojiSelected: PropTypes.func.isRequired,

  /** Theme color used for loaders and active tab indicator */
  theme: PropTypes.string,

  /** Placeholder of search input */
  placeholder: PropTypes.string,

  /** Toggle the tabs on or off */
  showTabs: PropTypes.bool,

  /** Toggle the searchbar on or off */
  showSearchBar: PropTypes.bool,

  /** Toggle the history section on or off */
  showHistory: PropTypes.bool,

  /** Toggle section title on or off */
  showSectionTitles: PropTypes.bool,

  /** Set the default category. Use the `Categories` class */
  category: PropTypes.object,

  /** Number of columns across */
  columns: PropTypes.number,
};

EmojiSelector.defaultProps = {
  category: Categories.people,
  columns: 7,
  placeholder: 'Search...',
  showHistory: false,
  showSearchBar: true,
  showSectionTitles: true,
  showTabs: true,
  theme: '#007AFF',
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
    width: width,
  },
  frame: {
    flex: 1,
  },
  loader: {
    flex: 1,
    position: 'absolute',
    width: width,
    top: 0,
  },
  row: {
    alignItems: 'center',
  },
  search: {
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderRadius: 10,
        height: 36,
        paddingLeft: 8,
      },
    }),
    margin: 8,
  },
  searchbar_container: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    width: '100%',
    zIndex: 1,
  },
  sectionHeader: {
    color: '#3C4252',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    paddingBottom: 5,
    paddingLeft: 8.3,
    paddingRight: 4,
    paddingTop: 15,
    // textAlign: "center",
    textTransform: 'uppercase',
    width: '100%',
  },
  sectionHeaderWrap: {
    backgroundColor: '#ffffff',
    marginRight: 10,
    paddingLeft: 10,
  },
  sectionStickyHeaderWrap: {
    marginLeft: 10,
    flex: 1,
  },
  sectionStickyHeader: {
    color: '#3C4252',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
    paddingBottom: 5,
    paddingLeft: 8.3,
    paddingRight: 4,
    paddingTop: 5,
    textTransform: 'uppercase',
    backgroundColor: '#ffffffee',
  },
  sectionStickyBlur: {
    marginTop: 10,
    borderRadius: 15,
  },
  tabBar: {
    alignSelf: 'center',
    bottom: 24,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'space-between',
    padding: 4,
    position: 'absolute',
    width: 276,
  },
  overlay: {
    height: 200,
    width: width,
    backgroundColor: colors.red,
  },
});
